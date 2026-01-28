const axios = require('axios');
const API_URL = 'http://localhost:5000'; // Default port based on server.js

async function resetSystem() {
    try {
        console.log("Sending reset request to server...");
        const response = await axios.post(`${API_URL}/api/reset`, {
            action: 'FULL_RESET'
        });
        console.log("Response:", response.data);
    } catch (error) {
        console.error("Reset failed:", error.response ? error.response.data : error.message);
    }
}

resetSystem();
