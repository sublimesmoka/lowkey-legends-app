const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create database directory
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'lowkey_legends.db'));

console.log('🖤 Setting up Lowkey Legends database...\n');

db.pragma('foreign_keys = ON');

// Users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        marketing_opt_in INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
console.log('✓ Users table created');

// Addresses table
db.exec(`
    CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        is_default INTEGER DEFAULT 0,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        address_line1 TEXT NOT NULL,
        address_line2 TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        country TEXT DEFAULT 'US',
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);
console.log('✓ Addresses table created');

// Orders table
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        subtotal REAL NOT NULL,
        tax_amount REAL DEFAULT 0,
        shipping_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        shipping_first_name TEXT,
        shipping_last_name TEXT,
        shipping_address1 TEXT,
        shipping_address2 TEXT,
        shipping_city TEXT,
        shipping_state TEXT,
        shipping_postal_code TEXT,
        shipping_country TEXT,
        shipping_email TEXT,
        stripe_payment_intent_id TEXT,
        printify_order_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`);
console.log('✓ Orders table created');

// Order items table
db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        size TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        image_url TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
`);
console.log('✓ Order items table created');

// Cart table
db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id TEXT,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);
console.log('✓ Cart items table created');

// Marketing subscribers table
db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        subscribed INTEGER DEFAULT 1,
        subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
`);
console.log('✓ Marketing subscribers table created');

// Tax rates table
db.exec(`
    CREATE TABLE IF NOT EXISTS tax_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state_code TEXT UNIQUE NOT NULL,
        state_name TEXT NOT NULL,
        rate REAL NOT NULL
    )
`);
console.log('✓ Tax rates table created');

// Insert tax rates
const taxRates = [
    ['AL', 'Alabama', 0.04], ['AK', 'Alaska', 0.00], ['AZ', 'Arizona', 0.056],
    ['AR', 'Arkansas', 0.065], ['CA', 'California', 0.0725], ['CO', 'Colorado', 0.029],
    ['CT', 'Connecticut', 0.0635], ['DE', 'Delaware', 0.00], ['FL', 'Florida', 0.06],
    ['GA', 'Georgia', 0.04], ['HI', 'Hawaii', 0.04], ['ID', 'Idaho', 0.06],
    ['IL', 'Illinois', 0.0625], ['IN', 'Indiana', 0.07], ['IA', 'Iowa', 0.06],
    ['KS', 'Kansas', 0.065], ['KY', 'Kentucky', 0.06], ['LA', 'Louisiana', 0.0445],
    ['ME', 'Maine', 0.055], ['MD', 'Maryland', 0.06], ['MA', 'Massachusetts', 0.0625],
    ['MI', 'Michigan', 0.06], ['MN', 'Minnesota', 0.06875], ['MS', 'Mississippi', 0.07],
    ['MO', 'Missouri', 0.04225], ['MT', 'Montana', 0.00], ['NE', 'Nebraska', 0.055],
    ['NV', 'Nevada', 0.0685], ['NH', 'New Hampshire', 0.00], ['NJ', 'New Jersey', 0.06625],
    ['NM', 'New Mexico', 0.05125], ['NY', 'New York', 0.08], ['NC', 'North Carolina', 0.0475],
    ['ND', 'North Dakota', 0.05], ['OH', 'Ohio', 0.0575], ['OK', 'Oklahoma', 0.045],
    ['OR', 'Oregon', 0.00], ['PA', 'Pennsylvania', 0.06], ['RI', 'Rhode Island', 0.07],
    ['SC', 'South Carolina', 0.06], ['SD', 'South Dakota', 0.045], ['TN', 'Tennessee', 0.07],
    ['TX', 'Texas', 0.0625], ['UT', 'Utah', 0.061], ['VT', 'Vermont', 0.06],
    ['VA', 'Virginia', 0.053], ['WA', 'Washington', 0.065], ['WV', 'West Virginia', 0.06],
    ['WI', 'Wisconsin', 0.05], ['WY', 'Wyoming', 0.04], ['DC', 'District of Columbia', 0.06]
];

const insertTax = db.prepare('INSERT OR IGNORE INTO tax_rates (state_code, state_name, rate) VALUES (?, ?, ?)');
taxRates.forEach(t => insertTax.run(t[0], t[1], t[2]));
console.log('✓ Tax rates inserted');

// Products table
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        tag TEXT,
        description TEXT,
        image_url TEXT,
        sizes TEXT,
        printify_id TEXT
    )
`);
console.log('✓ Products table created');

// Insert products
const products = [
    [1, "Lowkey Lunar Moth T-Shirt", 32.00, "mens", "new", "Embrace the darkness. The lunar moth moves through the night unseen, drawn to light but never consumed by it.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204172443-1f0d1361-f840-6418-b422-3e44ef610fa5.png?revision=1764869157368&s=2048", '["S","M","L","XL","2XL"]', "25350654"],
    [2, "Lowkey Hot Hand T-Shirt", 32.00, "mens", "bestseller", "When you're on fire, you don't need to announce it. The results speak.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204173523-1f0d1379-d0b0-6b38-b36f-86f8438d3c28.png?revision=1764869769766&s=2048", '["S","M","L","XL","2XL"]', "25331169"],
    [3, "Lowkey Origami Crane T-Shirt", 32.00, "mens", "", "Patience. Precision. Quiet artistry. The crane is folded one crease at a time, never rushed.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204173242-1f0d1373-cb2c-64ec-b3d2-8e012d9bf3d9.png?revision=1764869606468&s=2048", '["S","M","L","XL","2XL"]', "25330988"],
    [4, "Lowkey King Playing Card T-Shirt", 32.00, "mens", "bestseller", "Royalty isn't given. It's earned. Play your cards right and let the table figure it out.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204173638-1f0d137c-9cfc-6ab4-8378-c28b24327b5e.png?revision=1764869849520&s=2048", '["S","M","L","XL","2XL"]', "25329557"],
    [5, "Lowkey Stoic Antiquity Bust T-Shirt", 32.00, "mens", "", "Ancient wisdom for modern legends. The stoics knew: control what you can, release what you can't.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204172725-1f0d1368-03e3-662a-a1be-ea49b7904c33.png?revision=1764869301402&s=2048", '["S","M","L","XL","2XL"]', "25329194"],
    [6, "Lowkey Listen to the Beat T-Shirt", 32.00, "mens", "new", "March to your own rhythm. The ear diagram represents those who listen to their internal beat.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204173353-1f0d1376-734c-67c4-a9ef-6ebd34b82e9d.png?revision=1764869690978&s=2048", '["S","M","L","XL","2XL"]', "25325219"],
    [7, "Lowkey King Playing Card Women's T-Shirt", 32.00, "womens", "bestseller", "Queens can be kings too. Royalty isn't given. It's earned.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204171617-1f0d134f-21a3-6f70-9335-c28b24327b5e.png?revision=1764868622340&s=400", '["S","M","L","XL","2XL"]', "25352891"],
    [8, "Lowkey Lunar Moth Women's T-Shirt", 32.00, "womens", "new", "Embrace the darkness. The lunar moth moves through the night unseen.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204170419-1f0d1334-5c60-6a7a-b8dd-727b19e21130.png?revision=1764867967389&s=400", '["S","M","L","XL","2XL"]', "25353284"],
    [9, "Lowkey Origami Crane Women's T-Shirt", 32.00, "womens", "", "Patience. Precision. Quiet artistry.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204165240-1f0d131a-5617-6e1c-95db-6a7a3312108b.png?revision=1764867283522&s=400", '["S","M","L","XL","2XL"]', "25353179"],
    [10, "Lowkey Stoic Antiquity Bust Women's T-Shirt", 32.00, "womens", "", "Ancient wisdom for modern legends.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204171734-1f0d1351-f921-6892-957b-86f8438d3c28.png?revision=1764868698827&s=400", '["S","M","L","XL","2XL"]', "25353088"],
    [11, "Lowkey Listen to the Beat Women's T-Shirt", 32.00, "womens", "", "March to your own rhythm.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204171959-1f0d1357-6575-6796-8fbb-e27225756f85.png?revision=1764868844522&s=400", '["S","M","L","XL","2XL"]', "25352744"],
    [12, "Lowkey Hot Hand Women's T-Shirt", 32.00, "womens", "", "When you're on fire, you don't need to announce it.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204171321-1f0d1348-8d22-6744-b178-6ebd34b82e9d.png?revision=1764868462423&s=400", '["S","M","L","XL","2XL"]', "25352574"],
    [13, "Lowkey Lady Cropped Top Tee", 32.00, "womens", "exclusive", "Women's exclusive design. Feminine power, quiet confidence.", "https://pfy-prod-products-mockup-media.s3.us-east-2.amazonaws.com/files/2025/12/20251204192322-1f0d146b-2950-649a-9a3a-0a1ce80947fd.png?revision=1764876247939&s=400", '["S","M","L","XL"]', "25347945"],
    [14, "Lowkey Legends Insulated Tumbler", 36.00, "accessories", "new", "20oz stainless steel insulated travel cup. For the 3AM grinders who need their fuel.", "https://images-api.printify.com/mockup/692e2bb8a0b81ff6220f8075/78458/41628/lowkey-legends-insulated-20oz-tumbler-stainless-travel-cup.jpg?camera_label=front&revision=1764727722216&s=400", '["20oz"]', "25324445"]
];

const insertProduct = db.prepare('INSERT OR REPLACE INTO products (id, name, price, category, tag, description, image_url, sizes, printify_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
products.forEach(p => insertProduct.run(...p));
console.log('✓ Products inserted');

db.close();
console.log('\n🖤 Database setup complete!');
console.log('📁 Database location: ./database/lowkey_legends.db\n');