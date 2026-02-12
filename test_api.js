
const axios = require('axios');

async function test() {
    try {
        const payload = {
            unique_id: 'TEST-' + Date.now(),
            name: 'Test NonRegular User',
            customer_type: 'Non-Regular',
            employment_status: 'Non-Regular',
            payment_status: 'Not Paid'
        };

        console.log('Sending payload:', payload);
        const res = await axios.post('http://localhost:5000/api/customer', payload);
        console.log('Response:', res.data);
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}

test();
