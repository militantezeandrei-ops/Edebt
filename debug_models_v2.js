const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GOOGLE_VISION_API_KEY;

if (!API_KEY) {
    console.error("No API KEY found in .env");
    process.exit(1);
}

async function checkModels() {
    try {
        console.log("Querying available models...");
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );

        console.log("--- AVAILABLE MODELS ---");
        const models = response.data.models;
        if (models) {
            models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`Name: ${m.name} | Methods: ${m.supportedGenerationMethods.join(', ')}`);
                }
            });
        } else {
            console.log("No models found in response.");
        }
    } catch (error) {
        console.error("Error fetching models:", error.response ? error.response.data : error.message);
    }
}

checkModels();
