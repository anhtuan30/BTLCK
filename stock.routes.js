// routes/stock.routes.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');

router.post('/imports', stockController.createStockImport);
router.get('/imports', stockController.getStockImports);

module.exports = router;