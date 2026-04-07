const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Public routes
router.get('/', inventoryController.getInventory);
router.get('/status', inventoryController.getStockStatus);
router.get('/value', inventoryController.getInventoryValue);
router.get('/:productId', inventoryController.getInventoryByProduct);

// Protected routes
router.put('/:id', inventoryController.updateInventory);
router.post('/bulk-update', inventoryController.bulkUpdateInventory);

module.exports = router;
