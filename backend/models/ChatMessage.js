const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'chart', 'data', 'recommendation'],
    default: 'text',
  },
  metadata: {
    intent: String,
    entities: [String],
    confidence: Number,
    responseTime: Number,
    source: {
      type: String,
      enum: ['ai', 'rule-based', 'cached'],
      default: 'rule-based',
    },
  },
  platform: {
    type: String,
    enum: ['web', 'mobile', 'api'],
    default: 'web',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for conversation history retrieval
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });

// TTL index to auto-delete old messages after 90 days
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
