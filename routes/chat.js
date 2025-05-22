const express = require('express');
const router  = express.Router();
const { getCompletion } = require('../services/openai');

router.post('/', async (req, res, next) => {
  try {
    const { message, systemPrompt } = req.body;
    const reply = await getCompletion(message, systemPrompt);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
