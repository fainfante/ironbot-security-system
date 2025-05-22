const OpenAI = require('openai');
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getCompletion(prompt, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role:'system', content:systemPrompt });
  messages.push({ role:'user', content:prompt });
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages
  });
  return res.choices[0].message.content;
}

module.exports = { getCompletion };