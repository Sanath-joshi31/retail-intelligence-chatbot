const OpenAI = require('openai');
const ChatMessage = require('../models/ChatMessage');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');

// Initialize OpenAI (optional)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Cache for common queries
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// Intent patterns for rule-based system
const INTENT_PATTERNS = {
  low_stock: {
    patterns: [
      /low stock/i,
      /out of stock/i,
      /inventory.*low/i,
      /what.*low.*stock/i,
      /items.*running.*low/i,
      /reorder/i,
    ],
  },
  sales_trend: {
    patterns: [
      /sales.*trend/i,
      /sales.*pattern/i,
      /how.*sales.*doing/i,
      /sales.*performance/i,
      /trend.*sales/i,
    ],
  },
  top_selling: {
    patterns: [
      /top.*sell/i,
      /best.*sell/i,
      /popular.*product/i,
      /most.*sold/i,
      /highest.*sale/i,
    ],
  },
  recommend: {
    patterns: [
      /recommend/i,
      /suggest/i,
      /what.*buy/i,
      /good.*product/i,
      /should.*get/i,
    ],
  },
  inventory_status: {
    patterns: [
      /inventory.*status/i,
      /stock.*level/i,
      /how.*many.*left/i,
      /quantity.*stock/i,
      /current.*inventory/i,
    ],
  },
  product_search: {
    patterns: [
      /find.*product/i,
      /search.*product/i,
      /do.*have.*\w+/i,
      /check.*product/i,
    ],
  },
  revenue: {
    patterns: [
      /revenue/i,
      /total.*sale/i,
      /how.*much.*made/i,
      /earnings/i,
      /income/i,
    ],
  },
  category_performance: {
    patterns: [
      /category.*performance/i,
      /which.*category.*best/i,
      /category.*sale/i,
      /department.*performance/i,
    ],
  },
  forecast: {
    patterns: [
      /forecast/i,
      /predict/i,
      /expect.*sale/i,
      /future.*trend/i,
      /projection/i,
    ],
  },
  greeting: {
    patterns: [
      /hello/i,
      /hi/i,
      /hey/i,
      /good.*morning/i,
      /good.*afternoon/i,
      /good.*evening/i,
    ],
  },
  help: {
    patterns: [
      /help/i,
      /what.*can.*do/i,
      /command/i,
      /feature/i,
      /capability/i,
    ],
  },
};

// Detect intent from message
function detectIntent(message) {
  const lowerMessage = message.toLowerCase();

  for (const [intent, { patterns }] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }
  }

  return 'unknown';
}

// Extract entities from message
function extractEntities(message, intent) {
  const entities = {};

  // Extract product names
  const productKeywords = message.match(/(?:product|item|article)\s+(?:named?\s+)?["']?([^"']+)["']?/i);
  if (productKeywords) {
    entities.productName = productKeywords[1].trim();
  }

  // Extract numbers (quantities, dates)
  const numbers = message.match(/\b(\d+)\b/g);
  if (numbers) {
    entities.numbers = numbers.map(Number);
  }

  // Extract time references
  if (/\b(today|yesterday|this\s+week|last\s+week|this\s+month|last\s+month)\b/i.test(message)) {
    const timeMatch = message.match(/\b(today|yesterday|this\s+week|last\s+week|this\s+month|last\s+month)\b/i);
    entities.timeframe = timeMatch ? timeMatch[1].toLowerCase() : 'default';
  }

  // Extract category
  const categories = ['electronics', 'clothing', 'home', 'garden', 'sports', 'books', 'toys', 'food', 'beauty'];
  for (const category of categories) {
    if (message.toLowerCase().includes(category)) {
      entities.category = category;
      break;
    }
  }

  return entities;
}

// Rule-based response generator
async function generateRuleBasedResponse(intent, entities) {
  const responses = {
    greeting: {
      text: "Hello! 👋 I'm your Retail Intelligence Assistant. I can help you with:\n\n• 📊 Sales analytics and trends\n• 📦 Inventory management\n• 🛍️ Product recommendations\n• 📈 Business insights\n\nWhat would you like to know today?",
      type: 'text',
    },
    help: {
      text: "I can help you with:\n\n📊 **Sales & Analytics**:\n• \"Show sales trends\"\n• \"What's our revenue?\"\n• \"Forecast next week's sales\"\n\n📦 **Inventory**:\n• \"What is low stock?\"\n• \"Show inventory status\"\n• \"Which items need reordering?\"\n\n🛍️ **Products**:\n• \"Recommend products\"\n• \"Top selling items\"\n• \"Find electronics products\"\n\nJust ask me anything about your retail business!",
      type: 'text',
    },
    low_stock: async () => {
      const lowStock = await Inventory.find({ quantity: { $lte: '$minStockLevel' } })
        .populate('product', 'name sku price category')
        .limit(10);

      if (lowStock.length === 0) {
        return {
          text: "✅ Great news! All products are well-stocked. No items are currently below minimum stock levels.",
          type: 'text',
        };
      }

      const items = lowStock.map(item => {
        const product = item.product || {};
        return `• ${product.name || 'Unknown'} (SKU: ${product.sku || 'N/A'})\n  Stock: ${item.quantity} | Min: ${item.minStockLevel} | Category: ${product.category || 'N/A'}`;
      }).join('\n');

      return {
        text: `⚠️ **Low Stock Alert**\n\n${lowStock.length} product(s) need attention:\n\n${items}\n\n💡 Recommendation: Consider reordering these items soon.`,
        type: 'data',
        data: { items: lowStock, count: lowStock.length },
      };
    },
    sales_trend: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const sales = await Sale.find({
        status: 'completed',
        createdAt: { $gte: startDate },
      });

      if (sales.length === 0) {
        return {
          text: "📊 No sales data available for the past 30 days. Start recording sales to see trends!",
          type: 'text',
        };
      }

      const dailyRevenue = {};
      sales.forEach(sale => {
        const date = sale.createdAt.toISOString().split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + sale.total;
      });

      const chartData = Object.entries(dailyRevenue)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
      const avgDaily = totalRevenue / chartData.length;

      // Determine trend
      const firstHalf = chartData.slice(0, Math.floor(chartData.length / 2));
      const secondHalf = chartData.slice(Math.floor(chartData.length / 2));
      const firstAvg = firstHalf.reduce((s, d) => s + d.revenue, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, d) => s + d.revenue, 0) / secondHalf.length;
      const trendPercent = ((secondAvg - firstAvg) / firstAvg) * 100;

      return {
        text: `📈 **Sales Trend **(Last 30 Days)\n\n• Total Revenue: $${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n• Daily Average: $${avgDaily.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n• Trend: ${trendPercent >= 0 ? '📈' : '📉'} ${Math.abs(trendPercent).toFixed(1)}% ${trendPercent >= 0 ? 'increase' : 'decrease'}\n• Total Orders: ${sales.length}`,
        type: 'chart',
        chartType: 'line',
        chartData: {
          labels: chartData.map(d => d.date.slice(5)), // MM-DD format
          datasets: [{
            label: 'Daily Revenue',
            data: chartData.map(d => Math.round(d.revenue)),
            borderColor: trendPercent >= 0 ? '#10b981' : '#ef4444',
            backgroundColor: trendPercent >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
        metadata: { trendDirection: trendPercent >= 0 ? 'up' : 'down', trendPercent },
      };
    },
    top_selling: async () => {
      const sales = await Sale.find({ status: 'completed' })
        .populate('items.product', 'name category price');

      const productStats = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const productId = item.product?._id?.toString();
          if (!productId) return;

          if (!productStats[productId]) {
            productStats[productId] = {
              name: item.product?.name || 'Unknown',
              category: item.product?.category || 'Unknown',
              price: item.product?.price || 0,
              quantity: 0,
              revenue: 0,
            };
          }
          productStats[productId].quantity += item.quantity;
          productStats[productId].revenue += item.unitPrice * item.quantity;
        });
      });

      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      if (topProducts.length === 0) {
        return {
          text: "📊 No sales data yet. Start recording sales to see top-selling products!",
          type: 'text',
        };
      }

      const list = topProducts.map((p, i) =>
        `${i + 1}. **${p.name}**\n   Sold: ${p.quantity} | Revenue: $${p.revenue.toLocaleString()} | Category: ${p.category}`
      ).join('\n');

      return {
        text: `🏆 **Top 10 Best-Selling Products**\n\n${list}`,
        type: 'chart',
        chartType: 'bar',
        chartData: {
          labels: topProducts.map(p => p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name),
          datasets: [{
            label: 'Units Sold',
            data: topProducts.map(p => p.quantity),
            backgroundColor: [
              '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
              '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6',
            ],
          }],
        },
        data: { products: topProducts },
      };
    },
    recommend: async () => {
      // Get products with good stock and sales history
      const products = await Product.find({ isActive: true }).limit(50);
      const sales = await Sale.find({ status: 'completed', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });

      // Calculate product scores
      const productScores = {};
      products.forEach(p => {
        productScores[p._id.toString()] = {
          product: p,
          score: 0,
          reasons: [],
        };
      });

      // Score based on recent sales
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const pid = item.product?.toString();
          if (productScores[pid]) {
            productScores[pid].score += item.quantity * 10;
            if (!productScores[pid].reasons.includes('Popular')) {
              productScores[pid].reasons.push('Popular');
            }
          }
        });
      });

      // Score based on stock level (prefer well-stocked)
      const inventory = await Inventory.find().populate('product');
      inventory.forEach(inv => {
        const pid = inv.product?._id?.toString();
        if (productScores[pid]) {
          const stockRatio = inv.quantity / (inv.maxStockLevel || 100);
          if (stockRatio > 0.5) {
            productScores[pid].score += 20;
            productScores[pid].reasons.push('Well-stocked');
          }
        }
      });

      // Get top recommendations
      const recommendations = Object.values(productScores)
        .filter(r => r.product && r.product.isActive)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (recommendations.length === 0) {
        return {
          text: "🛍️ Add more products to get personalized recommendations!",
          type: 'text',
        };
      }

      const list = recommendations.map((r, i) =>
        `${i + 1}. **${r.product.name}** - $${r.product.price}\n   Category: ${r.product.category}\n   Why: ${r.reasons.join(', ') || 'Great choice!'}`
      ).join('\n');

      return {
        text: `🛍️ **Recommended Products for You**\n\n${list}\n\n💡 These recommendations are based on popularity, stock availability, and customer demand.`,
        type: 'recommendation',
        data: {
          products: recommendations.map(r => ({
            id: r.product._id,
            name: r.product.name,
            price: r.product.price,
            category: r.product.category,
            reasons: r.reasons,
          })),
        },
      };
    },
    inventory_status: async () => {
      const inventory = await Inventory.find().populate('product', 'name sku category');
      const valueData = await Inventory.find().populate('product', 'price cost');

      const totalValue = valueData.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
      const totalItems = valueData.reduce((sum, item) => sum + item.quantity, 0);

      const statusCounts = { outOfStock: 0, lowStock: 0, inStock: 0 };
      inventory.forEach(item => {
        if (item.quantity === 0) statusCounts.outOfStock++;
        else if (item.quantity <= item.minStockLevel) statusCounts.lowStock++;
        else statusCounts.inStock++;
      });

      const categoryBreakdown = {};
      inventory.forEach(item => {
        const cat = item.product?.category || 'Other';
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { count: 0, value: 0 };
        }
        categoryBreakdown[cat].count++;
        categoryBreakdown[cat].value += (item.product?.price || 0) * item.quantity;
      });

      return {
        text: `📦 **Inventory Status Overview**\n\n• Total Products: ${inventory.length}\n• Total Items in Stock: ${totalItems.toLocaleString()}\n• Inventory Value: $${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n\n**Stock Status**:\n• ✅ In Stock: ${statusCounts.inStock}\n• ⚠️ Low Stock: ${statusCounts.lowStock}\n• ❌ Out of Stock: ${statusCounts.outOfStock}`,
        type: 'data',
        data: {
          summary: { totalValue, totalItems, ...statusCounts },
          categoryBreakdown,
        },
      };
    },
    revenue: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const sales = await Sale.find({
        status: 'completed',
        createdAt: { $gte: startDate },
      });

      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const totalOrders = sales.length;
      const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Compare with previous period
      const prevStartDate = new Date();
      prevStartDate.setDate(prevStartDate.getDate() - 60);
      const prevEndDate = new Date();
      prevEndDate.setDate(prevEndDate.getDate() - 30);

      const prevSales = await Sale.find({
        status: 'completed',
        createdAt: { $gte: prevStartDate, $lte: prevEndDate },
      });
      const prevRevenue = prevSales.reduce((sum, s) => sum + s.total, 0);
      const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      return {
        text: `💰 **Revenue Report **(Last 30 Days)\n\n• Total Revenue: $${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n• Total Orders: ${totalOrders}\n• Average Order Value: $${avgOrder.toLocaleString('en-US', { maximumFractionDigits: 2 })}\n• Growth vs Previous Period: ${growth >= 0 ? '📈' : '📉'} ${Math.abs(growth).toFixed(1)}%`,
        type: 'data',
        data: {
          totalRevenue,
          totalOrders,
          avgOrder,
          growth,
          previousRevenue: prevRevenue,
        },
      };
    },
    forecast: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const sales = await Sale.find({
        status: 'completed',
        createdAt: { $gte: startDate },
      });

      const dailyTotals = {};
      sales.forEach(sale => {
        const date = sale.createdAt.toISOString().split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + sale.total;
      });

      const values = Object.values(dailyTotals);
      const avgDaily = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      // Generate 7-day forecast
      const forecast = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const variance = 1 + (Math.random() * 0.4 - 0.2); // ±20% variance
        forecast.push({
          day: days[date.getDay()],
          date: date.toISOString().split('T')[0],
          predicted: Math.round(avgDaily * variance),
        });
      }

      return {
        text: `🔮 **7-Day Sales Forecast**\n\nBased on your average daily revenue of $${Math.round(avgDaily)}:\n\n${forecast.map(f => `• ${f.day}: ~$${f.predicted.toLocaleString()}`).join('\n')}\n\n⚠️ Note: This is a simple forecast. Actual results may vary based on seasonality, promotions, and market conditions.`,
        type: 'chart',
        chartType: 'line',
        chartData: {
          labels: forecast.map(f => f.day),
          datasets: [{
            label: 'Predicted Revenue',
            data: forecast.map(f => f.predicted),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
        data: { forecast, baseline: Math.round(avgDaily) },
      };
    },
    unknown: () => ({
      text: "🤔 I'm not sure I understand that query. Here are some things I can help you with:\n\n• \"What is low stock?\"\n• \"Show sales trends\"\n• \"Recommend products\"\n• \"Top selling items\"\n• \"What's our revenue?\"\n\nTry asking about sales, inventory, or product recommendations!",
      type: 'text',
    }),
  };

  const handler = responses[intent] || responses.unknown;
  return typeof handler === 'function' ? handler() : handler;
}

// Generate AI response using OpenAI
async function generateAIResponse(message, context = []) {
  if (!openai) {
    throw new Error('OpenAI not configured');
  }

  // Build conversation context
  const messages = [
    {
      role: 'system',
      content: `You are a helpful Retail Intelligence Assistant. You help business owners understand their sales, inventory, and make data-driven decisions.

You can answer questions about:
- Sales trends and revenue
- Inventory levels and stock alerts
- Product recommendations
- Business forecasts

Be concise, friendly, and data-focused. When you don't have access to real data, explain what information would be needed.

Always format responses clearly with bullet points and emojis where appropriate.`,
    },
    ...context.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: message,
    },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    max_tokens: 500,
    temperature: 0.7,
  });

  return {
    text: response.choices[0].message.content,
    type: 'text',
  };
}

// Main chat handler
exports.sendMessage = async (req, res) => {
  const startTime = Date.now();
  const { message, sessionId = 'default-session', platform = 'web' } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Message content is required',
    });
  }

  try {
    // Save user message
    await ChatMessage.create({
      sessionId,
      role: 'user',
      content: message,
      platform,
    });

    // Check cache for common queries
    const cacheKey = `chat:${message.toLowerCase().trim()}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      const responseTime = Date.now() - startTime;
      await ChatMessage.create({
        sessionId,
        role: 'assistant',
        content: cachedResponse.text,
        type: cachedResponse.type,
        metadata: { ...cachedResponse.metadata, responseTime, source: 'cached' },
        platform,
      });

      return res.json({
        success: true,
        data: cachedResponse,
        metadata: { responseTime, source: 'cached' },
      });
    }

    // Detect intent
    const intent = detectIntent(message);
    const entities = extractEntities(message, intent);

    let response;
    let source = 'rule-based';

    // Try AI first if configured, fallback to rule-based
    if (openai && intent !== 'greeting' && intent !== 'help') {
      try {
        const context = await ChatMessage.find({ sessionId })
          .sort({ createdAt: -1 })
          .limit(10);

        response = await generateAIResponse(message, context);
        source = 'ai';
      } catch (aiError) {
        console.log('AI fallback to rule-based:', aiError.message);
        response = await generateRuleBasedResponse(intent, entities);
        source = 'rule-based';
      }
    } else {
      response = await generateRuleBasedResponse(intent, entities);
    }

    // Ensure response has all required fields
    response = response || { text: 'Unable to generate response', type: 'text' };

    // Save assistant response
    const responseTime = Date.now() - startTime;
    await ChatMessage.create({
      sessionId,
      role: 'assistant',
      content: response.text,
      type: response.type,
      metadata: { intent, entities: Object.keys(entities), responseTime, source },
      platform,
    });

    // Cache the response
    cache.set(cacheKey, response);

    res.json({
      success: true,
      data: response,
      metadata: {
        intent,
        entities,
        responseTime,
        source,
      },
    });
  } catch (error) {
    console.error('Error in chatbot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: error.message,
    });
  }
};

// Get conversation history
exports.getHistory = async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: messages.reverse(),
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message,
    });
  }
};

// Clear conversation history
exports.clearHistory = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    await ChatMessage.deleteMany({ sessionId });

    res.json({
      success: true,
      message: 'History cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear history',
      error: error.message,
    });
  }
};

// Health check
exports.healthCheck = async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      aiConfigured: !!openai,
      timestamp: new Date().toISOString(),
    },
  });
};
