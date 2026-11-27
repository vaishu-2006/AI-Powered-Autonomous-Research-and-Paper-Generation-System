const axios = require('axios');

async function chatJson(prompt, maxTokens = 3500) {
  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error('OPENROUTER_API_KEY is not configured. Add it to server/.env before generating research content.');
    error.status = 503;
    throw error;
  }
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
      temperature: 0.25,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: 'You are an academic research assistant. Return one valid JSON object only. Never invent sources, factual claims about studies, or experimental results.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    }, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 120000
    });
    const choice = response.data.choices?.[0];
    const content = choice?.message?.content;
    if (!content || choice.finish_reason === 'length') {
      throw new Error('The AI response was empty or truncated. Try again or choose a model with a larger output limit.');
    }
    return JSON.parse(content);
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.message;
    const failure = new Error(`OpenRouter generation failed: ${detail}`);
    failure.status = error.response?.status === 401 ? 503 : 502;
    throw failure;
  }
}

module.exports = { chatJson };
