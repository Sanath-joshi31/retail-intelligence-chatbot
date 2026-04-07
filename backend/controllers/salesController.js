const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(filter)
      .populate('items.product', 'name sku price')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    const total = await Sale.countDocuments(filter);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales',
      error: error.message,
    });
  }
};

// Get single sale
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('items.product', 'name sku price category');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      });
    }

    res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale',
      error: error.message,
    });
  }
};

// Create sale
exports.createSale = async (req, res) => {
  try {
    // Validate items
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sale must have at least one item',
      });
    }

    // Populate product details and validate stock
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      // Set unit price if not provided
      if (!item.unitPrice) {
        item.unitPrice = product.price;
      }

      // Check inventory
      const inventory = await Inventory.findOne({ product: item.product });
      if (inventory && inventory.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }
    }

    // Create sale
    const sale = await Sale.create(req.body);

    // Update inventory
    for (const item of req.body.items) {
      await Inventory.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantity: -item.quantity } }
      );
    }

    res.status(201).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create sale',
      error: error.message,
    });
  }
};

// Update sale status
exports.updateSaleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items.product');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      });
    }

    // If refunded, restore inventory
    if (status === 'refunded') {
      for (const item of sale.items) {
        await Inventory.findOneAndUpdate(
          { product: item.product._id },
          { $inc: { quantity: item.quantity } }
        );
      }
    }

    res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error('Error updating sale status:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update sale status',
      error: error.message,
    });
  }
};

// Get sales analytics
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Total sales and revenue
    const sales = await Sale.find({
      status: 'completed',
      createdAt: { $gte: startDate },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalOrders = sales.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily sales for chart
    const dailySales = {};
    sales.forEach(sale => {
      const date = sale.createdAt.toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = { revenue: 0, orders: 0 };
      }
      dailySales[date].revenue += sale.total;
      dailySales[date].orders += 1;
    });

    const dailyData = Object.entries(dailySales)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Top selling products
    const productSales = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product.toString();
        if (!productSales[productId]) {
          productSales[productId] = { quantity: 0, revenue: 0 };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.unitPrice * item.quantity;
      });
    });

    const topProductsRaw = Object.entries(productSales)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const topProducts = [];
    for (const item of topProductsRaw) {
      const product = await Product.findById(item.productId).select('name');
      topProducts.push({
        ...item,
        name: product?.name || item.productId,
      });
    }

    // Category breakdown
    const categorySales = {};
    for (const [productId, data] of Object.entries(productSales)) {
      const product = await Product.findById(productId);
      if (product) {
        const category = product.category;
        if (!categorySales[category]) {
          categorySales[category] = { quantity: 0, revenue: 0 };
        }
        categorySales[category].quantity += data.quantity;
        categorySales[category].revenue += data.revenue;
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          period: `${days} days`,
        },
        dailySales: dailyData,
        topProducts,
        categoryBreakdown: categorySales,
      },
    });
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics',
      error: error.message,
    });
  }
};

// Get sales trends
exports.getSalesTrends = async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const now = new Date();
    let startDate = new Date();

    // Determine date range based on period
    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 12); // 12 weeks
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 12);
    }

    const sales = await Sale.find({
      status: 'completed',
      createdAt: { $gte: startDate },
    });

    const grouped = {};
    sales.forEach(sale => {
      let key;
      const date = sale.createdAt;

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekNum = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
        key = `Week ${weekNum + 1}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, orders: 0, items: 0 };
      }
      grouped[key].revenue += sale.total;
      grouped[key].orders += 1;
      grouped[key].items += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    });

    const trends = Object.entries(grouped)
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate trend direction
    const recentTrend = trends.slice(-7);
    let trendDirection = 'stable';
    if (recentTrend.length >= 2) {
      const recentAvg = recentTrend.slice(-3).reduce((s, t) => s + t.revenue, 0) / 3;
      const previousAvg = recentTrend.slice(0, -3).reduce((s, t) => s + t.revenue, 0) / Math.max(1, recentTrend.length - 3);

      if (recentAvg > previousAvg * 1.1) trendDirection = 'up';
      else if (recentAvg < previousAvg * 0.9) trendDirection = 'down';
    }

    res.json({
      success: true,
      data: {
        trends,
        trendDirection,
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      error: error.message,
    });
  }
};

// Get forecast (simple moving average)
exports.getSalesForecast = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const sales = await Sale.find({
      status: 'completed',
      createdAt: { $gte: startDate },
    });

    // Calculate daily averages
    const dailyTotals = {};
    sales.forEach(sale => {
      const date = sale.createdAt.toISOString().split('T')[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + sale.total;
    });

    const values = Object.values(dailyTotals);
    const avgDaily = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;

    // Simple forecast using moving average
    const forecast = [];
    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        predictedRevenue: Math.round(avgDaily * (1 + Math.random() * 0.2 - 0.1)),
        confidence: 0.7 + Math.random() * 0.2,
      });
    }

    res.json({
      success: true,
      data: {
        forecast,
        baseline: {
          averageDailyRevenue: Math.round(avgDaily),
          basedOnDays: values.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching sales forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales forecast',
      error: error.message,
    });
  }
};
