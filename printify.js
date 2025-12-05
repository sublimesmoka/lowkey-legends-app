// printify.js
// Printify API helper module for Lowkey Legends

require('dotenv').config();
const axios = require('axios');

const PRINTIFY_API_TOKEN = process.env.PRINTIFY_API_TOKEN;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;

if (!PRINTIFY_API_TOKEN || !PRINTIFY_SHOP_ID) {
  console.warn('⚠️  PRINTIFY_API_TOKEN or PRINTIFY_SHOP_ID missing in .env');
}

const printifyApi = axios.create({
  baseURL: 'https://api.printify.com/v1',
  headers: {
    'Authorization': `Bearer ${PRINTIFY_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

// ====== PRODUCTS ======

async function getProducts() {
  const res = await printifyApi.get(`/shops/${PRINTIFY_SHOP_ID}/products.json`);
  return res.data.data;
}

async function getProduct(productId) {
  const res = await printifyApi.get(`/shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`);
  return res.data;
}

// ====== ORDERS ======

async function createOrder(orderPayload) {
  const res = await printifyApi.post(`/shops/${PRINTIFY_SHOP_ID}/orders.json`, orderPayload);
  return res.data;
}

async function getOrder(orderId) {
  const res = await printifyApi.get(`/shops/${PRINTIFY_SHOP_ID}/orders/${orderId}.json`);
  return res.data;
}

async function cancelOrder(orderId) {
  const res = await printifyApi.post(`/shops/${PRINTIFY_SHOP_ID}/orders/${orderId}/cancel.json`);
  return res.data;
}

// ====== SHIPPING ======

async function getShippingCost(orderPayload) {
  const res = await printifyApi.post(`/shops/${PRINTIFY_SHOP_ID}/orders/shipping.json`, orderPayload);
  return res.data;
}

// ====== HELPER: Format product for frontend ======

function formatProduct(p) {
  const firstVariant = p.variants?.[0];
  const firstImage = p.images?.find(img => img.is_default) || p.images?.[0];
  
  return {
    id: p.id,
    name: p.title,
    price: firstVariant ? firstVariant.price / 100 : 0,
    category: detectCategory(p.title),
    image_url: firstImage ? firstImage.src : '',
    images: p.images?.map(img => img.src) || [],
    sizes: [...new Set(p.variants?.filter(v => v.is_available).map(v => v.title) || [])],
    description: stripHtml(p.description || ''),
    variants: p.variants?.map(v => ({
      id: v.id,
      title: v.title,
      price: v.price / 100,
      is_available: v.is_available
    })) || []
  };
}

function detectCategory(title) {
  const lower = title.toLowerCase();
  if (lower.includes('women') || lower.includes('cropped') || lower.includes('lady')) return 'womens';
  if (lower.includes('tumbler') || lower.includes('mug') || lower.includes('hat') || lower.includes('bag')) return 'accessories';
  return 'mens';
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

// ====== HELPER: Find variant ID by size ======

async function findVariantId(printifyProductId, size) {
  try {
    const product = await getProduct(printifyProductId);
    const variant = product.variants?.find(v => 
      v.title.toLowerCase() === size.toLowerCase() && v.is_available
    );
    return variant ? variant.id : null;
  } catch (err) {
    console.error('Error finding variant:', err.message);
    return null;
  }
}

// ====== EXPORTS ======

module.exports = {
  // API instance (for direct access if needed)
  api: printifyApi,
  shopId: PRINTIFY_SHOP_ID,
  
  // Products
  getProducts,
  getProduct,
  formatProduct,
  
  // Orders
  createOrder,
  getOrder,
  cancelOrder,
  
  // Shipping
  getShippingCost,
  
  // Helpers
  findVariantId,
  detectCategory
};