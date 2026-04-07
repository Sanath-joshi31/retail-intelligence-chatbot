require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Sale = require('../models/Sale');

// Sample products data
const productsData = [
  {
    name: 'iPhone 15 Pro',
    description: 'Latest Apple flagship smartphone with A17 Pro chip',
    sku: 'ELEC-001',
    category: 'Electronics',
    price: 999.99,
    cost: 750,
    tags: ['smartphone', 'apple', '5g', 'premium'],
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Premium Android smartphone with S Pen',
    sku: 'ELEC-002',
    category: 'Electronics',
    price: 1199.99,
    cost: 900,
    tags: ['smartphone', 'samsung', 'android', 'premium'],
  },
  {
    name: 'MacBook Air M3',
    description: 'Ultra-thin laptop with Apple M3 chip',
    sku: 'ELEC-003',
    category: 'Electronics',
    price: 1299.99,
    cost: 950,
    tags: ['laptop', 'apple', 'm3', 'portable'],
  },
  {
    name: 'Sony WH-1000XM5',
    description: 'Premium noise-canceling wireless headphones',
    sku: 'ELEC-004',
    category: 'Electronics',
    price: 349.99,
    cost: 220,
    tags: ['headphones', 'sony', 'wireless', 'noise-canceling'],
  },
  {
    name: 'iPad Pro 12.9"',
    description: 'Professional tablet with M2 chip',
    sku: 'ELEC-005',
    category: 'Electronics',
    price: 1099.99,
    cost: 800,
    tags: ['tablet', 'apple', 'ipad', 'professional'],
  },
  {
    name: 'Nike Air Max 270',
    description: 'Comfortable running shoes with Air cushioning',
    sku: 'CLTH-001',
    category: 'Clothing',
    price: 149.99,
    cost: 75,
    tags: ['shoes', 'nike', 'running', 'sports'],
  },
  {
    name: 'Adidas Ultraboost 23',
    description: 'High-performance running shoes',
    sku: 'CLTH-002',
    category: 'Clothing',
    price: 189.99,
    cost: 95,
    tags: ['shoes', 'adidas', 'running', 'performance'],
  },
  {
    name: 'Levi\'s 501 Original Jeans',
    description: 'Classic straight-fit denim jeans',
    sku: 'CLTH-003',
    category: 'Clothing',
    price: 79.99,
    cost: 35,
    tags: ['jeans', 'levis', 'denim', 'classic'],
  },
  {
    name: 'North Face Jacket',
    description: 'Waterproof winter jacket',
    sku: 'CLTH-004',
    category: 'Clothing',
    price: 249.99,
    cost: 125,
    tags: ['jacket', 'winter', 'waterproof', 'outdoor'],
  },
  {
    name: 'Ray-Ban Aviator Sunglasses',
    description: 'Classic pilot-style sunglasses',
    sku: 'CLTH-005',
    category: 'Clothing',
    price: 169.99,
    cost: 85,
    tags: ['sunglasses', 'rayban', 'accessories', 'classic'],
  },
  {
    name: 'KitchenAid Stand Mixer',
    description: 'Professional 5-quart stand mixer',
    sku: 'HOME-001',
    category: 'Home & Garden',
    price: 379.99,
    cost: 250,
    tags: ['kitchen', 'mixer', 'appliance', 'baking'],
  },
  {
    name: 'Dyson V15 Vacuum',
    description: 'Cordless vacuum with laser detection',
    sku: 'HOME-002',
    category: 'Home & Garden',
    price: 649.99,
    cost: 450,
    tags: ['vacuum', 'dyson', 'cordless', 'cleaning'],
  },
  {
    name: 'Instant Pot Duo 7-in-1',
    description: 'Multi-use pressure cooker',
    sku: 'HOME-003',
    category: 'Home & Garden',
    price: 99.99,
    cost: 55,
    tags: ['kitchen', 'cooker', 'appliance', 'multi-use'],
  },
  {
    name: 'Philips Hue Starter Kit',
    description: 'Smart LED light bulbs with hub',
    sku: 'HOME-004',
    category: 'Home & Garden',
    price: 199.99,
    cost: 120,
    tags: ['smart-home', 'lighting', 'philips', 'automation'],
  },
  {
    name: 'Weber Genesis Grill',
    description: '3-burner gas grill',
    sku: 'HOME-005',
    category: 'Home & Garden',
    price: 899.99,
    cost: 600,
    tags: ['grill', 'weber', 'outdoor', 'bbq'],
  },
  {
    name: 'Peloton Bike+',
    description: 'Indoor cycling bike with rotating screen',
    sku: 'SPORTS-001',
    category: 'Sports',
    price: 2495.00,
    cost: 1800,
    tags: ['fitness', 'cycling', 'peloton', 'cardio'],
  },
  {
    name: 'Bowflex SelectTech Dumbbells',
    description: 'Adjustable weight dumbbells 5-52.5 lbs',
    sku: 'SPORTS-002',
    category: 'Sports',
    price: 349.99,
    cost: 200,
    tags: ['weights', 'dumbbells', 'fitness', 'strength'],
  },
  {
    name: 'Yoga Mat Premium',
    description: '6mm thick eco-friendly yoga mat',
    sku: 'SPORTS-003',
    category: 'Sports',
    price: 49.99,
    cost: 20,
    tags: ['yoga', 'mat', 'fitness', 'eco-friendly'],
  },
  {
    name: 'Garmin Fenix 7',
    description: 'Multisport GPS smartwatch',
    sku: 'SPORTS-004',
    category: 'Sports',
    price: 699.99,
    cost: 450,
    tags: ['smartwatch', 'garmin', 'gps', 'fitness'],
  },
  {
    name: 'TRX Suspension Trainer',
    description: 'Complete bodyweight training system',
    sku: 'SPORTS-005',
    category: 'Sports',
    price: 169.99,
    cost: 90,
    tags: ['trainer', 'trx', 'bodyweight', 'fitness'],
  },
  {
    name: 'Atomic Habits - James Clear',
    description: 'Bestselling self-help book',
    sku: 'BOOK-001',
    category: 'Books',
    price: 16.99,
    cost: 8,
    tags: ['book', 'self-help', 'bestseller', 'habits'],
  },
  {
    name: 'The Psychology of Money',
    description: 'Financial wisdom by Morgan Housel',
    sku: 'BOOK-002',
    category: 'Books',
    price: 18.99,
    cost: 9,
    tags: ['book', 'finance', 'psychology', 'investing'],
  },
  {
    name: 'Kindle Paperwhite',
    description: 'Waterproof e-reader with 6.8" display',
    sku: 'ELEC-006',
    category: 'Electronics',
    price: 139.99,
    cost: 90,
    tags: ['e-reader', 'kindle', 'amazon', 'reading'],
  },
  {
    name: 'LEGO Star Wars Millennium Falcon',
    description: 'Ultimate Collector Series - 7541 pieces',
    sku: 'TOYS-001',
    category: 'Toys',
    price: 849.99,
    cost: 600,
    tags: ['lego', 'star-wars', 'collectible', 'building'],
  },
  {
    name: 'Nintendo Switch OLED',
    description: 'Gaming console with OLED screen',
    sku: 'ELEC-007',
    category: 'Electronics',
    price: 349.99,
    cost: 250,
    tags: ['gaming', 'nintendo', 'console', 'portable'],
  },
  {
    name: 'PlayStation 5',
    description: 'Next-gen gaming console',
    sku: 'ELEC-008',
    category: 'Electronics',
    price: 499.99,
    cost: 400,
    tags: ['gaming', 'playstation', 'sony', 'console'],
  },
  {
    name: 'AirPods Pro 2',
    description: 'Wireless earbuds with active noise cancellation',
    sku: 'ELEC-009',
    category: 'Electronics',
    price: 249.99,
    cost: 160,
    tags: ['earbuds', 'apple', 'wireless', 'anc'],
  },
  {
    name: 'Apple Watch Series 9',
    description: 'Advanced health and fitness smartwatch',
    sku: 'ELEC-010',
    category: 'Electronics',
    price: 399.99,
    cost: 280,
    tags: ['smartwatch', 'apple', 'fitness', 'health'],
  },
  {
    name: 'Canon EOS R6 Mark II',
    description: 'Full-frame mirrorless camera',
    sku: 'ELEC-011',
    category: 'Electronics',
    price: 2499.99,
    cost: 1900,
    tags: ['camera', 'canon', 'mirrorless', 'photography'],
  },
  {
    name: 'DJI Mini 4 Pro',
    description: 'Compact drone with 4K HDR video',
    sku: 'ELEC-012',
    category: 'Electronics',
    price: 759.99,
    cost: 550,
    tags: ['drone', 'dji', 'camera', 'aerial'],
  },
];

// Generate inventory for each product
function generateInventory(products) {
  return products.map(product => ({
    product: product._id,
    quantity: Math.floor(Math.random() * 150) + 10, // 10-160 units
    minStockLevel: Math.floor(Math.random() * 20) + 10, // 10-30
    maxStockLevel: 200,
    reorderPoint: 30,
    warehouse: 'Main',
    location: `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`,
  }));
}

// Generate realistic sales history
function generateSales(products) {
  const sales = [];
  const now = new Date();
  const daysToGenerate = 60;

  // Weight products by popularity (electronics sell more)
  const weights = products.map(p => {
    if (p.category === 'Electronics') return 3;
    if (p.category === 'Clothing') return 2;
    return 1;
  });

  for (let d = daysToGenerate; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    // Generate 3-8 sales per day
    const numSales = Math.floor(Math.random() * 6) + 3;

    for (let s = 0; s < numSales; s++) {
      // Select random products (1-4 items per sale)
      const numItems = Math.floor(Math.random() * 4) + 1;
      const selectedProducts = [];

      for (let i = 0; i < numItems; i++) {
        // Weighted random selection
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;

        for (let j = 0; j < products.length; j++) {
          random -= weights[j];
          if (random <= 0) {
            selectedIndex = j;
            break;
          }
        }

        const product = products[selectedIndex];
        const discount = Math.random() < 0.2 ? Math.floor(Math.random() * 15) : 0; // 20% chance of discount

        selectedProducts.push({
          product: product._id,
          quantity: Math.floor(Math.random() * 3) + 1,
          unitPrice: product.price,
          discount,
        });
      }

      // Random sale time within the day
      const saleDate = new Date(date);
      saleDate.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60)); // 9 AM - 9 PM

      const paymentMethods = ['card', 'cash', 'digital_wallet', 'credit'];
      const stores = ['Main Store', 'Downtown Branch', 'Online', 'Mall Location'];

      sales.push({
        saleId: `SALE-${date.getTime()}-${s}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        customer: {
          name: `Customer ${Math.floor(Math.random() * 1000)}`,
          email: `customer${Math.floor(Math.random() * 1000)}@example.com`,
          loyaltyId: Math.random() < 0.3 ? `LOYAL-${Math.floor(Math.random() * 10000)}` : null,
        },
        items: selectedProducts,
        subtotal: 0, // Will be calculated by schema hook
        discount: Math.random() < 0.1 ? Math.floor(Math.random() * 50) : 0,
        tax: 0, // Calculated by schema hook
        total: 0, // Calculated by schema hook
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: Math.random() < 0.95 ? 'completed' : (Math.random() < 0.5 ? 'refunded' : 'pending'),
        store: stores[Math.floor(Math.random() * stores.length)],
        cashier: `Cashier ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
        createdAt: saleDate,
      });
    }
  }

  return sales;
}

async function seedDatabase() {
  try {
    await connectDB();

    console.log('🗑️  Clearing existing data...');
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Sale.deleteMany({});

    console.log('📦 Creating products...');
    const products = await Product.create(productsData);
    console.log(`✅ Created ${products.length} products`);

    console.log('📊 Creating inventory records...');
    const inventoryData = generateInventory(products);
    const inventory = await Inventory.create(inventoryData);
    console.log(`✅ Created ${inventory.length} inventory records`);

    // Make some products low stock for demo
    console.log('📉 Adjusting some inventory levels...');
    await Inventory.findByIdAndUpdate(
      inventory[0]._id,
      { quantity: 5, minStockLevel: 15 } // iPhone - low stock
    );
    await Inventory.findByIdAndUpdate(
      inventory[7]._id,
      { quantity: 3, minStockLevel: 10 } // Levi's - low stock
    );
    await Inventory.findByIdAndUpdate(
      inventory[15]._id,
      { quantity: 0, minStockLevel: 5 } // Peloton - out of stock
    );

    console.log('💰 Generating sales history...');
    const salesData = generateSales(products);
    const sales = await Sale.create(salesData);
    console.log(`✅ Created ${sales.length} sales records`);

    // Update inventory based on sales
    console.log('🔄 Updating inventory based on sales...');
    for (const sale of sales) {
      if (sale.status === 'completed') {
        for (const item of sale.items) {
          await Inventory.findOneAndUpdate(
            { product: item.product },
            { $inc: { quantity: -item.quantity } }
          );
        }
      }
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   🎉 Database Seeded!                     ║
╠═══════════════════════════════════════════════════════════╣
║  Products:    ${String(products.length).padEnd(41)}║
║  Inventory:   ${String(inventory.length).padEnd(41)}║
║  Sales:       ${String(sales.length).padEnd(41)}║
╚═══════════════════════════════════════════════════════════╝
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
