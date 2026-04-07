const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Chat endpoints
router.post('/message', chatbotController.sendMessage);
router.get('/history', chatbotController.getHistory);
router.post('/history/clear', chatbotController.clearHistory);

// Health check
router.get('/health', chatbotController.healthCheck);

module.exports = router;
