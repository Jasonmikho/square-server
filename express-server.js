// express-server.js

const { config } = require('dotenv');
config({ path: '../.env' }); // ← adjust if needed
config();

const express = require('express');
const cors = require('cors');
const { Client, Environment } = require('square/legacy');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Auth
const client = new Client({
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN_SANDBOX,
});

app.post('/payments', async (req, res) => {
  const { amount, source_id, memo } = req.body;

  if (!amount || !source_id || !memo) {
    return res.status(400).json({ error: 'Missing amount, source_id, or memo.' });
  }

  try {
    const body = {
      sourceId: source_id,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: Math.round(parseFloat(amount) * 100), // $ to cents
        currency: 'USD',
      },
      autocomplete: true,
      referenceId: memo,
    };

    const response = await client.paymentsApi.createPayment(body);

    // Serialize BigInt safely
    const safePayment = JSON.parse(JSON.stringify(response.result.payment, (_, val) =>
      typeof val === 'bigint' ? val.toString() : val
    ));
    
    res.json({ payment: safePayment });

  } catch (error) {
    console.error('❌ Square Payment Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Square server running at http://localhost:${PORT}`);
});
