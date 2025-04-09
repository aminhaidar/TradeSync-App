const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Parses a trade alert text using OpenAI's GPT-4 model
 * @param {string} alertText - The raw trade alert text to parse
 * @returns {Promise<Object>} Structured trade alert data
 */
async function parseTradeAlert(alertText) {
  try {
    const systemPrompt = `
You are a trade alert parser. Given a raw trade alert text, return a JSON object with the following fields:
- action: entry, exit, trim, add
- ticker: string (e.g. "TSLA")
- position_type: Call, Put, or Shares
- strike_price: number or null
- expiration_date: YYYY-MM-DD or null
- entry_price: number or null
- quantity: number or null
- confidence: high, medium, low
- notes: freeform string or null

Only return valid JSON. Do not include any explanations or markdown formatting.
`;

    const userPrompt = `Parse this trade alert: "${alertText}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for more consistent outputs
      max_tokens: 500
    });

    // Parse the response
    const parsedResponse = JSON.parse(completion.choices[0].message.content);

    // Validate required fields
    if (!parsedResponse.ticker || !parsedResponse.action) {
      throw new Error('Missing required fields in parsed response');
    }

    return {
      ...parsedResponse,
      original_text: alertText,
      parsed_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Trade Alert Parser Error]:', error);
    throw new Error(`Failed to parse trade alert: ${error.message}`);
  }
}

module.exports = { parseTradeAlert }; 