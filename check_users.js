const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

async function checkUsers() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI ? 'URI found' : 'URI missing');
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        let users = await User.find({});
        if (users.length === 0) {
            console.log('No users found. Seeding default admin...');
            const admin = new User({
                username: 'admin',
                password: 'password123',
                role: 'admin'
            });
            const staff = new User({
                username: 'staff',
                password: 'password123',
                role: 'staff'
            });
            await admin.save();
            await staff.save();
            console.log('Default users created: admin/password123, staff/password123');
            users = await User.find({});
        }

        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`- ${u.username} (${u.role})`));

        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

checkUsers();
