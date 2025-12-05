// db.js
// Database connection and helper functions for Lowkey Legends

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './database/lowkey_legends.db';
const db = new Database(path.resolve(dbPath));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('🗄️  Database connected:', dbPath);

// ====== USER FUNCTIONS ======

const createUser = db.prepare(`
  INSERT INTO users (email, password_hash, first_name, last_name, phone, marketing_opt_in)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getUserByEmail = db.prepare(`
  SELECT * FROM users WHERE email = ?
`);

const getUserById = db.prepare(`
  SELECT id, email, first_name, last_name, phone, marketing_opt_in, created_at
  FROM users WHERE id = ?
`);

// ====== ADDRESS FUNCTIONS ======

const createAddress = db.prepare(`
  INSERT INTO addresses (user_id, is_default, first_name, last_name, address_line1, address_line2, city, state, postal_code, country, phone)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getAddressesByUser = db.prepare(`
  SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
`);

const deleteAddress = db.prepare(`
  DELETE FROM addresses WHERE id = ? AND user_id = ?
`);

// ====== ORDER FUNCTIONS ======

const createOrder = db.prepare(`
  INSERT INTO orders (
    user_id, order_number, status, subtotal, tax_amount, shipping_amount, total_amount,
    shipping_first_name, shipping_last_name, shipping_address1, shipping_address2,
    shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_email,
    stripe_payment_intent_id, printify_order_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const createOrderItem = db.prepare(`
  INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price, total_price, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getOrdersByUser = db.prepare(`
  SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
`);

const getOrderByNumber = db.prepare(`
  SELECT * FROM orders WHERE order_number = ?
`);

const getOrderItems = db.prepare(`
  SELECT * FROM order_items WHERE order_id = ?
`);

const updateOrderStatus = db.prepare(`
  UPDATE orders SET status = ? WHERE id = ?
`);

const updateOrderPrintifyId = db.prepare(`
  UPDATE orders SET printify_order_id = ? WHERE id = ?
`);

// ====== PRODUCT FUNCTIONS ======

const getAllProducts = db.prepare(`
  SELECT * FROM products ORDER BY id
`);

const getProductById = db.prepare(`
  SELECT * FROM products WHERE id = ?
`);

const getProductByPrintifyId = db.prepare(`
  SELECT * FROM products WHERE printify_id = ?
`);

// ====== TAX FUNCTIONS ======

const getTaxRate = db.prepare(`
  SELECT rate FROM tax_rates WHERE state_code = ?
`);

// ====== CART FUNCTIONS (for logged-in users) ======

const getCartByUser = db.prepare(`
  SELECT * FROM cart_items WHERE user_id = ? ORDER BY created_at
`);

const getCartBySession = db.prepare(`
  SELECT * FROM cart_items WHERE session_id = ? ORDER BY created_at
`);

const addCartItem = db.prepare(`
  INSERT INTO cart_items (user_id, session_id, product_id, product_name, size, quantity, unit_price, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateCartItemQty = db.prepare(`
  UPDATE cart_items SET quantity = ? WHERE id = ?
`);

const deleteCartItem = db.prepare(`
  DELETE FROM cart_items WHERE id = ?
`);

const clearCartByUser = db.prepare(`
  DELETE FROM cart_items WHERE user_id = ?
`);

const clearCartBySession = db.prepare(`
  DELETE FROM cart_items WHERE session_id = ?
`);

const transferCartToUser = db.prepare(`
  UPDATE cart_items SET user_id = ?, session_id = NULL WHERE session_id = ?
`);

// ====== MARKETING FUNCTIONS ======

const addSubscriber = db.prepare(`
  INSERT OR IGNORE INTO marketing_subscribers (email, user_id) VALUES (?, ?)
`);

const removeSubscriber = db.prepare(`
  UPDATE marketing_subscribers SET subscribed = 0 WHERE email = ?
`);

// ====== EXPORT ======

module.exports = {
  db,
  
  // Users
  createUser,
  getUserByEmail,
  getUserById,
  
  // Addresses
  createAddress,
  getAddressesByUser,
  deleteAddress,
  
  // Orders
  createOrder,
  createOrderItem,
  getOrdersByUser,
  getOrderByNumber,
  getOrderItems,
  updateOrderStatus,
  updateOrderPrintifyId,
  
  // Products
  getAllProducts,
  getProductById,
  getProductByPrintifyId,
  
  // Tax
  getTaxRate,
  
  // Cart
  getCartByUser,
  getCartBySession,
  addCartItem,
  updateCartItemQty,
  deleteCartItem,
  clearCartByUser,
  clearCartBySession,
  transferCartToUser,
  
  // Marketing
  addSubscriber,
  removeSubscriber
};