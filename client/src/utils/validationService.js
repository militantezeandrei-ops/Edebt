/**
 * Validation Service
 * Provides fuzzy matching and validation utilities for handwritten order processing
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance between strings
 */
export const levenshteinDistance = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[s2.length][s1.length];
};

/**
 * Calculate similarity score between two strings (0 to 1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (1 = identical, 0 = completely different)
 */
export const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
};

/**
 * Find the closest matching customer from a list
 * @param {string} name - The name to match
 * @param {Array} customerList - List of customer objects
 * @returns {Object|null} - { customer, confidence } or null if no good match
 */
export const findClosestCustomer = (name, customerList) => {
    if (!name || !customerList || customerList.length === 0) {
        return null;
    }

    const normalizedName = name.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const customer of customerList) {
        if (!customer.name) continue;

        // Check exact match first
        if (customer.name.toLowerCase() === normalizedName) {
            return { customer, confidence: 1.0 };
        }

        // Check if unique_id matches
        if (customer.unique_id && customer.unique_id.toLowerCase() === normalizedName) {
            return { customer, confidence: 1.0 };
        }

        // Calculate similarity
        const similarity = calculateSimilarity(normalizedName, customer.name);

        // Also check if the name contains the query or vice versa
        const containsBonus = customer.name.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(customer.name.toLowerCase()) ? 0.1 : 0;

        const score = Math.min(similarity + containsBonus, 1.0);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = customer;
        }
    }

    // STANCE: User requested "dont rely on save names", "display what is extract text".
    // We increase threshold significantly to avoid aggressive fuzzy matching.
    // Only accept match if it is almost identical (0.9+).
    if (bestMatch && bestScore >= 0.9) {
        return { customer: bestMatch, confidence: bestScore };
    }

    return null;
};

/**
 * Find the closest matching menu item from a list
 * @param {string} itemName - The item name to match
 * @param {Array} menuList - List of menu item objects
 * @returns {Object|null} - { item, confidence } or null if no good match
 */
export const findClosestMenuItem = (itemName, menuList) => {
    if (!itemName || !menuList || menuList.length === 0) {
        return null;
    }

    const normalizedName = itemName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const item of menuList) {
        if (!item.name) continue;

        // Check exact match first
        if (item.name.toLowerCase() === normalizedName) {
            return { item, confidence: 1.0 };
        }

        // Calculate similarity
        const similarity = calculateSimilarity(normalizedName, item.name);

        // Bonus for partial matches (common in handwriting)
        const containsBonus = item.name.toLowerCase().includes(normalizedName) ||
            normalizedName.includes(item.name.toLowerCase()) ? 0.15 : 0;

        const score = Math.min(similarity + containsBonus, 1.0);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = item;
        }
    }

    if (bestMatch && bestScore >= 0.4) {
        return { item: bestMatch, confidence: bestScore };
    }

    return null;
};

/**
 * Normalize a price value from OCR text
 * Handles common OCR errors in numeric recognition
 * @param {string} priceText - The price text to normalize
 * @returns {number|null} - Normalized price or null if invalid
 */
export const normalizePrice = (priceText) => {
    if (!priceText) return null;

    // Convert to string if not already
    let text = String(priceText);

    // Remove currency symbols and whitespace
    text = text.replace(/[₱$€£¥]/g, '').trim();

    // Common OCR substitutions for numbers
    const substitutions = {
        'O': '0', 'o': '0',
        'l': '1', 'I': '1', 'i': '1', '|': '1',
        'Z': '2', 'z': '2',
        'E': '3',
        'A': '4',
        'S': '5', 's': '5',
        'G': '6', 'b': '6',
        'T': '7',
        'B': '8',
        'g': '9', 'q': '9'
    };

    // Apply substitutions only if no valid digits found
    let hasDigits = /\d/.test(text);
    if (!hasDigits) {
        for (const [letter, digit] of Object.entries(substitutions)) {
            text = text.replace(new RegExp(letter, 'g'), digit);
        }
    }

    // Remove any remaining non-numeric characters except decimal point
    text = text.replace(/[^\d.]/g, '');

    // Handle multiple decimal points
    const parts = text.split('.');
    if (parts.length > 2) {
        text = parts[0] + '.' + parts.slice(1).join('');
    }

    // Parse as float
    const price = parseFloat(text);

    // Validate the result
    if (isNaN(price) || price < 0 || price > 100000) {
        return null;
    }

    // Round to 2 decimal places
    return Math.round(price * 100) / 100;
};

/**
 * Parse raw OCR text into structured order data
 * Expected format:
 * - Upper section: Customer name
 * - Lower section: Items with prices
 * @param {string} rawText - Raw OCR text
 * @returns {Object} - { name, items: [{name, price}] }
 */
export const parseOrderText = (rawText) => {
    if (!rawText || typeof rawText !== 'string') {
        return { name: '', items: [] };
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) {
        return { name: '', items: [] };
    }

    // First line(s) are typically the customer name
    // Look for the first line that doesn't contain price-like patterns
    let nameLines = [];
    let itemStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if line contains price pattern (numbers at end, or ₱/$/etc)
        const hasPricePattern = /[\d₱$€£¥]+\s*$/.test(line) ||
            /[₱$€£¥]\s*\d+/.test(line) ||
            /\d+\.\d{2}/.test(line);

        if (hasPricePattern && i > 0) {
            itemStartIndex = i;
            break;
        }
        nameLines.push(line);
        if (i >= 1) {
            // Assume max 2 lines for name
            itemStartIndex = i + 1;
            break;
        }
    }

    const name = nameLines.join(' ').trim();

    // Parse items with prices
    const items = [];
    for (let i = itemStartIndex; i < lines.length; i++) {
        const line = lines[i];

        // Try to extract item name and price
        // Pattern: "Item Name    123" or "Item Name ₱123" or "Item Name - 123"
        const priceMatch = line.match(/(.+?)[\s\-–—]+([₱$€£¥]?\s*[\d.,]+)\s*$/);

        if (priceMatch) {
            const itemName = priceMatch[1].trim();
            const priceText = priceMatch[2].trim();

            if (itemName.length > 0) {
                items.push({
                    originalName: itemName,
                    originalPrice: priceText
                });
            }
        } else if (line.length > 2 && !/^\d+$/.test(line)) {
            // Line without clear price - might still be an item
            items.push({
                originalName: line,
                originalPrice: null
            });
        }
    }

    return { name, items };
};

/**
 * Validate an entire parsed order against local databases
 * @param {Object} parsedOrder - { name, items }
 * @param {Array} customers - List of customer objects
 * @param {Array} menuItems - List of menu item objects
 * @returns {Object} - Validated order with matches and confidence scores
 */
export const validateOrder = (parsedOrder, customers, menuItems) => {
    if (!parsedOrder) {
        return {
            customer: null,
            customerConfidence: 0,
            originalName: '',
            items: []
        };
    }

    // Validate customer name
    const customerMatch = findClosestCustomer(parsedOrder.name, customers);

    // Validate each item
    const validatedItems = (parsedOrder.items || []).map(item => {
        // const menuMatch = findClosestMenuItem(item.originalName, menuItems); // Disabled match for now
        const normalizedPrice = normalizePrice(item.originalPrice);

        return {
            originalName: item.originalName,
            originalPrice: item.originalPrice,
            // Use exact extracted text as requested, do not override with DB name
            validatedName: item.originalName,
            // Use normalized price from OCR, or original text if normalization failed
            validatedPrice: normalizedPrice !== null ? normalizedPrice : null,
            confidence: 1.0, // Treat as 100% since we are accepting raw text
            menuItem: null
        };
    });

    return {
        customer: customerMatch?.customer || null,
        customerConfidence: customerMatch?.confidence || 0,
        originalName: parsedOrder.name,
        items: validatedItems
    };
};

export default {
    levenshteinDistance,
    calculateSimilarity,
    findClosestCustomer,
    findClosestMenuItem,
    normalizePrice,
    parseOrderText,
    validateOrder
};
