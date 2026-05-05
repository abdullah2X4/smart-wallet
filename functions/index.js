const {onRequest} = require("firebase-functions/v2/https");
const fetch = require("node-fetch");

exports.askGroq = onRequest({cors: true}, async (req, res) => {
  try {
    const groqKey = process.env.GROQ_KEY;
    const userMessage = req.body.message;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    const data = await groqResponse.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});
