const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Customer = require('../models/Customer');
const Order = require('../models/Order');

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error('MONGODB_URI is not defined!');
    process.exit(1);
}

const seedData = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB for seeding...');

        // Clear existing sample data if needed, or just add more
        // For this task, we will just add 20 new diverse customers

        const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
        const types = ['Regular', 'Non-Regular'];
        const statuses = ['Active', 'Inactive'];

        const customersToInsert = [];

        for (let i = 0; i < 20; i++) {
            const firstName = firstNames[i];
            const lastName = lastNames[i];
            const name = `${firstName} ${lastName}`;
            const unique_id = `SAMPLE-${1000 + i}`;
            const customer_type = types[Math.floor(Math.random() * types.length)];
            const is_active = Math.random() > 0.1; // 90% active

            customersToInsert.push({
                unique_id,
                name,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
                phone: `555-01${i.toString().padStart(2, '0')}`,
                customer_type,
                employment_status: customer_type === 'Non-Regular' ? 'Non-Regular' : 'Full-time',
                is_active,
                balance: 0,
                payment_status: 'Not Paid'
            });
        }

        const savedCustomers = await Customer.insertMany(customersToInsert);
        console.log(`Inserted ${savedCustomers.length} sample customers.`);

        // Add some orders for these customers to test the UI and analytics
        const ordersToInsert = [];
        const items = [
            { name: 'Soda', price: 20 },
            { name: 'Chips', price: 15 },
            { name: 'Burger', price: 55 },
            { name: 'Rice Meal', price: 75 },
            { name: 'Coffee', price: 30 },
            { name: 'Cake Slice', price: 45 },
            { name: 'Water', price: 10 }
        ];

        for (const customer of savedCustomers) {
            const numOrders = Math.floor(Math.random() * 5); // 0-4 orders per customer
            let customerBalance = 0;

            for (let j = 0; j < numOrders; j++) {
                const item = items[Math.floor(Math.random() * items.length)];
                const order_amount = item.price;
                customerBalance += order_amount;

                ordersToInsert.push({
                    customer_id: customer._id,
                    customer_unique_id: customer.unique_id,
                    order_name: item.name,
                    order_amount,
                    order_status: Math.random() > 0.3 ? 'completed' : 'pending',
                    createdAt: new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000)) // within last 10 days
                });
            }

            // Update customer balance and metadata
            if (customerBalance > 0) {
                await Customer.findByIdAndUpdate(customer._id, {
                    balance: customerBalance,
                    payment_status: 'Not Paid', // Match enum
                    last_transaction_date: new Date()
                });
            }
        }

        await Order.insertMany(ordersToInsert);
        console.log(`Inserted ${ordersToInsert.length} sample orders.`);

        console.log('✅ Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
