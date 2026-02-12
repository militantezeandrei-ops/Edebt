
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Customer = require('./models/Customer');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const customers = await Customer.find({});
        console.log(JSON.stringify(customers.map(c => ({
            uid: c.unique_id,
            name: c.name,
            type: c.customer_type,
            status: c.employment_status
        })), null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
