// routes/order.routes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

router.post('/', orderController.createOrder);
router.get('/customer/:customerId', orderController.getOrdersByCustomer);
router.get('/:id', orderController.getOrderById);
router.get('/', orderController.getAllOrders);
router.put('/:id', orderController.updateOrderStatus);
router.put('/:id/payment', orderController.updatePaymentStatus);
router.delete('/:id', orderController.deleteOrder);


module.exports = router;