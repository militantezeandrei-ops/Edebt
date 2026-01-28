const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/database');

const filipinoDishes = [
    { name: 'Chicken Adobo', description: 'Chicken braised in garlic, vinegar, oil, and soy sauce', price: 150.00, category: 'main', is_available: true },
    { name: 'Sinigang na Baboy', description: 'Pork meat in sour tamarind soup', price: 180.00, category: 'main', is_available: true },
    { name: 'Lechon Kawali', description: 'Deep fried crispy pork belly', price: 200.00, category: 'main', is_available: true },
    { name: 'Kare-Kare', description: 'Stew with thick savory peanut sauce', price: 220.00, category: 'main', is_available: true },
    { name: 'Pancit Canton', description: 'Stir-fried noodles with meat and vegetables', price: 120.00, category: 'main', is_available: true },
    { name: 'Lumpiang Shanghai', description: 'Fried spring rolls filled with ground pork', price: 100.00, category: 'main', is_available: true },
    { name: 'Sisig', description: 'Sizzling chopped pork with onion and chili', price: 190.00, category: 'main', is_available: true },
    { name: 'Halo-Halo', description: 'Mixed fruits, beans, and jelly with shaved ice and milk', price: 95.00, category: 'dessert', is_available: true },
    { name: 'Leche Flan', description: 'Caramel custard dessert', price: 70.00, category: 'dessert', is_available: true },
    { name: 'Sago\'t Gulaman', description: 'Sweet beverage with tapioca pearls and jelly', price: 50.00, category: 'drink', is_available: true }
];

const seedMenu = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Optional: Clear existing menu items if you want to start fresh (commented out for safety)
        // await MenuItem.deleteMany({}); 

        for (const dish of filipinoDishes) {
            const existing = await MenuItem.findOne({ name: dish.name });
            if (!existing) {
                await MenuItem.create(dish);
                console.log(`Added: ${dish.name}`);
            } else {
                console.log(`Skipped (already exists): ${dish.name}`);
            }
        }

        console.log('Menu seeding completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding menu:', err);
        process.exit(1);
    }
};

seedMenu();
