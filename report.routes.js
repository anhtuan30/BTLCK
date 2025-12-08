// routes/report.routes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

router.get('/stock/current', reportController.getCurrentStock);
router.get('/revenue/date', reportController.getRevenueByDate);
router.get('/revenue/month', reportController.getRevenueByMonth);
router.get('/customer/:customerId/history', reportController.getCustomerHistory);
router.get('/revenue', reportController.getRevenueStats);
router.get('/stock/date', reportController.getStockByDate);

module.exports = router;