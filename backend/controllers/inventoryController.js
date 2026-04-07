const Inventory = require('../models/Inventory');
const Product = require('../models/Product');

// Get all inventory
exports.getInventory = async (req, res) => {
  try {
    const { status, warehouse, limit = 100 } = req.query;

    const filter = {};
    if (warehouse) filter.warehouse = warehouse;

    const inventory = await Inventory.find(filter)
      .populate('product', 'name sku category price')
      .limit(parseInt(limit))
      .sort({ quantity: 1 });

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
  }
};

// Get inventory by product
exports.getInventoryByProduct = async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ product: req.params.productId })
      .populate('product', 'name sku category price');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found for this product',
      });
    }

    res.json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
  }
};

// Update inventory quantity
exports.updateInventory = async (req, res) => {
  try {
    const { quantity, adjustment } = req.body;

    let updateData = {};
    if (quantity !== undefined) {
      updateData.quantity = quantity;
    } else if (adjustment !== undefined) {
      // Use atomic increment/decrement
      const inventory = await Inventory.findById(req.params.id);
      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory not found',
        });
      }
      updateData.quantity = inventory.quantity + adjustment;
    }

    if (req.body.lastRestocked) {
      updateData.lastRestocked = req.body.lastRestocked;
    }

    const updatedInventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('product', 'name sku category');

    res.json({
      success: true,
      data: updatedInventory,
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update inventory',
      error: error.message,
    });
  }
};

// Get stock status summary
exports.getStockStatus = async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate('product', 'name category');

    const summary = {
      total: inventory.length,
      outOfStock: 0,
      lowStock: 0,
      reorderSoon: 0,
      inStock: 0,
      items: {
        outOfStock: [],
        lowStock: [],
        reorderSoon: [],
      },
    };

    inventory.forEach(item => {
      const status = item.stockStatus;

      switch (status) {
        case 'out_of_stock':
          summary.outOfStock++;
          summary.items.outOfStock.push({
            product: item.product,
            quantity: item.quantity,
            minLevel: item.minStockLevel,
          });
          break;
        case 'low_stock':
          summary.lowStock++;
          summary.items.lowStock.push({
            product: item.product,
            quantity: item.quantity,
            minLevel: item.minStockLevel,
          });
          break;
        case 'reorder_soon':
          summary.reorderSoon++;
          summary.items.reorderSoon.push({
            product: item.product,
            quantity: item.quantity,
            reorderPoint: item.reorderPoint,
          });
          break;
        default:
          summary.inStock++;
      }
    });

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching stock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock status',
      error: error.message,
    });
  }
};

// Bulk update inventory
exports.bulkUpdateInventory = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { productId, quantity }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates must be an array',
      });
    }

    const results = await Promise.all(
      updates.map(async (update) => {
        const inventory = await Inventory.findOneAndUpdate(
          { product: update.productId },
          { quantity: update.quantity, updatedAt: Date.now() },
          { new: true }
        ).populate('product', 'name sku');

        return inventory;
      })
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error bulk updating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update inventory',
      error: error.message,
    });
  }
};

// Get inventory value
exports.getInventoryValue = async (req, res) => {
  try {
    const inventory = await Inventory.find()
      .populate('product', 'price cost');

    const totalValue = inventory.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    const totalCost = inventory.reduce((sum, item) => {
      const cost = item.product?.cost || 0;
      return sum + (cost * item.quantity);
    }, 0);

    res.json({
      success: true,
      data: {
        totalValue,
        totalCost,
        potentialProfit: totalValue - totalCost,
        itemCount: inventory.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('Error calculating inventory value:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate inventory value',
      error: error.message,
    });
  }
};
