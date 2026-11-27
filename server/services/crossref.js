const axios = require('axios');

async function verifyDoi(doi) {
  if (!doi) return { verified: false };
  try {
    const response = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: process.env.CROSSREF_EMAIL ? { 'User-Agent': `ResearchAI/1.0 (mailto:${process.env.CROSSREF_EMAIL})` } : undefined,
      timeout: 15000
    });
    const message = response.data.message;
    return { verified: true, title: message.title?.[0], authors: message.author?.map(a => `${a.given || ''} ${a.family || ''}`.trim()), year: message.published?.['date-parts']?.[0]?.[0], url: message.URL };
  } catch (error) {
    return { verified: false, reason: error.response?.status === 404 ? 'DOI not found' : 'Crossref verification unavailable' };
  }
}

module.exports = { verifyDoi };
