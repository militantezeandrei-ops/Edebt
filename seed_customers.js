const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/database');

const firstNames = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
    "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Margaret", "Anthony", "Betty", "Donald", "Sandra",
    "Mark", "Ashley", "Paul", "Dorothy", "Steven", "Kimberly", "Andrew", "Emily", "Kenneth", "Donna",
    "Joshua", "Michelle", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Edward", "Deborah",
    "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Laura", "Jeffrey", "Sharon", "Ryan", "Cynthia",
    "Jacob", "Kathleen", "Gary", "Amy", "Nicholas", "Shirley", "Eric", "Angela", "Jonathan", "Helen",
    "Stephen", "Anna", "Larry", "Brenda", "Justin", "Pamela", "Scott", "Nicole", "Brandon", "Samantha"
];

const lastNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes",
    "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper",
    "Peterson", "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson"
];

const seedCustomers = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Delete all existing customers
        await Customer.deleteMany({});
        console.log('Deleted all existing customers.');

        const customers = [];
        const usedNames = new Set();

        let count = 0;
        while (count < 150) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const fullName = `${firstName} ${lastName}`;

            // Ensure uniqueness of names just for better realism (though ID is unique key)
            if (!usedNames.has(fullName)) {
                usedNames.add(fullName);

                // 15% chance of being inactive
                const isActive = Math.random() > 0.15;

                // Generate a consistent unique ID
                const idSuffix = String(count + 1).padStart(3, '0');

                customers.push({
                    unique_id: `CUST-${idSuffix}`,
                    name: fullName,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idSuffix}@example.com`,
                    phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
                    balance: 0,
                    is_active: isActive
                });
                count++;
            }
        }

        await Customer.insertMany(customers);
        console.log(`Successfully inserted ${customers.length} unique customers.`);

        process.exit(0);
    } catch (err) {
        console.error('Error seeding customers:', err);
        process.exit(1);
    }
};

seedCustomers();
