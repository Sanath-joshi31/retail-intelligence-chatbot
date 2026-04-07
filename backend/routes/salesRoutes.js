const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// Public routes
router.get('/', salesController.getSales);
router.get('/analytics', salesController.getSalesAnalytics);
router.get('/trends', salesController.getSalesTrends);
router.get('/forecast', salesController.getSalesForecast);
router.get('/:id', salesController.getSale);

// Protected routes
router.post('/', salesController.createSale);
router.patch('/:id/status', salesController.updateSaleStatus);

module.exports = router;
