// app.js - Main Server File
const express = require('express');
const cors = require('cors');

// Import Routes
const productRoutes = require('./routes/product.routes');
const customerRoutes = require('./routes/customer.routes');
const orderRoutes = require('./routes/order.routes');
const stockRoutes = require('./routes/stock.routes');
const reportRoutes = require('./routes/report.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/auth', authRoutes);



// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;