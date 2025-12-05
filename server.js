// server.js
// Lowkey Legends backend – serves the app, handles auth, payments, and connects to Printify

require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Modules
const db = require('./db');
const printify = require('./printify');
const { optionalAuth, requireAuth } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const checkoutRoutes = require('./routes/checkout');

const app = express();
const PORT = process.env.PORT || 3000;

// ====== SECURITY MIDDLEWARE ======
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Stricter limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ====== BASIC MIDDLEWARE ======
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== API ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes);

// ====== PRODUCTS ======
app.get('/api/products', async (req, res) => {
  try {
    // Try Printify first
    const data = await printify.getProducts();
    const products = data.map(p => printify.formatProduct(p));
    res.json({ success: true, products, source: 'printify' });
  } catch (err) {
    console.error('Printify error:', err.response?.data || err.message);
    
    // Fallback to database
    try {
      const dbProducts = db.getAllProducts.all();
      const products = dbProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        image_url: p.image_url,
        sizes: JSON.parse(p.sizes || '[]'),
        description: p.description || '',
        printify_id: p.printify_id
      }));
      res.json({ success: true, products, source: 'database' });
    } catch (dbErr) {
      console.error('Database error:', dbErr);
      res.status(500).json({ success: false, error: 'Failed to load products' });
    }
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = db.getProductById.get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({
      success: true,
      product: {
        ...product,
        sizes: JSON.parse(product.sizes || '[]')
      }
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ success: false, error: 'Failed to load product' });
  }
});

// ====== TAX ======
app.get('/api/tax/:stateCode', (req, res) => {
  try {
    const stateCode = req.params.stateCode.toUpperCase();
    const result = db.getTaxRate.get(stateCode);
    res.json({ success: true, rate: result ? result.rate : 0, stateCode });
  } catch (err) {
    console.error('Tax rate error:', err);
    res.status(500).json({ success: false, error: 'Failed to get tax rate' });
  }
});

// ====== ORDERS ======
app.get('/api/orders', requireAuth, (req, res) => {
  try {
    const orders = db.getOrdersByUser.all(req.user.id);
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: db.getOrderItems.all(order.id)
    }));
    res.json({ success: true, orders: ordersWithItems });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ success: false, error: 'Failed to load orders' });
  }
});

app.get('/api/orders/:orderNumber', optionalAuth, (req, res) => {
  try {
    const order = db.getOrderByNumber.get(req.params.orderNumber);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.user_id && req.user && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    const items = db.getOrderItems.all(order.id);
    res.json({ success: true, order: { ...order, items } });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ success: false, error: 'Failed to load order' });
  }
});

// ====== ADDRESSES ======
app.get('/api/addresses', requireAuth, (req, res) => {
  try {
    const addresses = db.getAddressesByUser.all(req.user.id);
    res.json({ success: true, addresses });
  } catch (err) {
    console.error('Get addresses error:', err);
    res.status(500).json({ success: false, error: 'Failed to load addresses' });
  }
});

app.post('/api/addresses', requireAuth, (req, res) => {
  try {
    const { firstName, lastName, addressLine1, addressLine2, city, state, postalCode, country, phone, isDefault } = req.body;
    
    if (!firstName || !lastName || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({ success: false, error: 'Missing required address fields' });
    }
    
    if (isDefault) {
      db.db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }
    
    const result = db.createAddress.run(
      req.user.id,
      isDefault ? 1 : 0,
      firstName,
      lastName,
      addressLine1,
      addressLine2 || null,
      city,
      state,
      postalCode,
      country || 'US',
      phone || null
    );
    
    res.status(201).json({ success: true, addressId: result.lastInsertRowid });
  } catch (err) {
    console.error('Create address error:', err);
    res.status(500).json({ success: false, error: 'Failed to save address' });
  }
});

app.delete('/api/addresses/:id', requireAuth, (req, res) => {
  try {
    const result = db.deleteAddress.run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) {
    console.error('Delete address error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete address' });
  }
});

// ====== FALLBACK: SERVE FRONTEND ======
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`
🖤 LOWKEY LEGENDS SERVER RUNNING
   URL: http://localhost:${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}
   Printify Shop: ${printify.shopId || '(not set)'}

   Move in silence. Let success make the noise.
  `);
});