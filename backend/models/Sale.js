const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
  },
});

const saleSchema = new mongoose.Schema({
  saleId: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    name: String,
    email: String,
    phone: String,
    loyaltyId: String,
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'digital_wallet', 'credit'],
    default: 'card',
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'refunded', 'cancelled'],
    default: 'completed',
  },
  store: {
    type: String,
    default: 'Main Store',
  },
  cashier: {
    type: String,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for analytics queries
saleSchema.index({ createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 });
saleSchema.index({ 'items.product': 1 });
saleSchema.index({ store: 1, createdAt: -1 });

// Pre-save hook to calculate totals
saleSchema.pre('save', function(next) {
  if (!this.saleId) {
    this.saleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity * (1 - item.discount / 100));
  }, 0);

  // Calculate tax (8% default)
  this.tax = this.subtotal * 0.08;

  // Calculate total
  this.total = this.subtotal + this.tax - this.discount;

  next();
});

module.exports = mongoose.model('Sale', saleSchema);
