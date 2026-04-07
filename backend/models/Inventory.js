const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  minStockLevel: {
    type: Number,
    required: true,
    default: 10,
  },
  maxStockLevel: {
    type: Number,
    default: 1000,
  },
  reorderPoint: {
    type: Number,
    default: 20,
  },
  warehouse: {
    type: String,
    default: 'Main',
  },
  location: {
    type: String,
    default: 'A-01',
  },
  lastRestocked: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual for stock status
inventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.minStockLevel) return 'low_stock';
  if (this.quantity <= this.reorderPoint) return 'reorder_soon';
  return 'in_stock';
});

// Index for faster queries
inventorySchema.index({ product: 1 });
inventorySchema.index({ stockStatus: 1 });

// Include virtuals in JSON output
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

// Update timestamp
inventorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
