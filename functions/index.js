const functions = require('firebase-functions');
const fetch = require('node-fetch');
require('dotenv').config();

exports.askGroq = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userMessage = req.body.message;
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{role: 'user', content: userMessage}],
        model: 'llama-3.1-8b-instant'
      })
    });
    const data = await groqRes.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});
