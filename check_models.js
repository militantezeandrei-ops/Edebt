const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // There isn't a direct "listModels" on the instance easily without using the admin API sometimes, 
        // but let's try a basic generation to see if we can get a clearer error or if a different model works.

        // Better yet, let's try to use the model that IS usually available: gemini-pro
        // But gemini-pro doesn't support images (it was gemini-pro-vision).
        // Newer gemini-pro (1.5) supports images.

        console.log("Checking available models...");
        // There isn't a simple public helper in the node SDK to list models without the fetch call.
    } catch (e) {
        console.error(e);
    }
}

console.log("To fix this, we will try 'gemini-1.5-flash-002' which is the specific version.");
