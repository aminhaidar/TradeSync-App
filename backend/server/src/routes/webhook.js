const express = require('express');
const router = express.Router();
const { parseTradeAlert } = require('../utils/parseTradeAlert');
const { DatabaseService } = require('../services/database');

const dbService = new DatabaseService();

/**
 * @route POST /api/webhook
 * @description Receives trading alerts from various sources
 * @access Public
 * 
 * @param {Object} req.body - The webhook payload
 * @param {string} req.body.source - Source of the alert (e.g., "Sniper", "Discord")
 * @param {string} req.body.platform - Platform where the alert originated
 * @param {string} req.body.alert_text - The actual alert message
 * @param {string} [req.body.timestamp] - Optional timestamp of the alert
 * 
 * @returns {Object} Response object with status and timestamp
 */
router.post('/', async (req, res) => {
  const { source, platform, alert_text, timestamp } = req.body;

  // Validate required fields
  if (!source || !alert_text) {
    return res.status(400).json({ 
      error: "Missing required fields",
      details: "Both 'source' and 'alert_text' are required"
    });
  }

  try {
    // Parse the trade alert using OpenAI
    const parsedAlert = await parseTradeAlert(alert_text);

    // Store the alert in the database
    const storedAlert = await dbService.createAlert(
      source,
      platform || 'unknown',
      alert_text,
      timestamp ? new Date(timestamp) : new Date(),
      parsedAlert
    );

    // If this is an entry alert, create a new trade
    if (parsedAlert.action === 'entry') {
      // First, get or create the source
      const sourceRecord = await dbService.createSource(source, platform);

      // Create the trade
      const trade = await dbService.createTrade(
        sourceRecord.id,
        parsedAlert.ticker,
        parsedAlert.position_type,
        parsedAlert.strike_price,
        parsedAlert.expiration_date ? new Date(parsedAlert.expiration_date) : undefined
      );

      // Create the trade entry
      await dbService.createTradeEntry(
        trade.id,
        new Date(),
        parsedAlert.entry_price,
        parsedAlert.quantity,
        alert_text
      );
    }

    // Return success response with parsed alert
    return res.status(200).json({ 
      status: "received",
      timestamp: new Date().toISOString(),
      parsed_alert: parsedAlert,
      stored_alert: storedAlert
    });

  } catch (error) {
    console.error('[Webhook Error]:', error);
    return res.status(500).json({
      error: "Failed to process trade alert",
      details: error.message
    });
  }
});

module.exports = router; 