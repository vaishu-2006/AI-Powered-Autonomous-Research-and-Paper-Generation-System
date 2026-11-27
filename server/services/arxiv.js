const axios = require('axios');
const { parseStringPromise } = require('xml2js');

async function searchArxiv(query, maxResults = 12) {
  const baseUrl = process.env.ARXIV_API_BASE_URL || 'https://export.arxiv.org/api/query';
  const response = await axios.get(baseUrl, {
    params: { search_query: `all:${query}`, start: 0, max_results: maxResults },
    timeout: 30000
  });
  const feed = await parseStringPromise(response.data, { explicitArray: false });
  const entries = feed.feed?.entry ? (Array.isArray(feed.feed.entry) ? feed.feed.entry : [feed.feed.entry]) : [];
  return entries.map((entry) => ({
    title: String(entry.title || '').replace(/\s+/g, ' ').trim(),
    authors: entry.author ? (Array.isArray(entry.author) ? entry.author.map(a => a.name) : [entry.author.name]) : [],
    abstract: String(entry.summary || '').replace(/\s+/g, ' ').trim(),
    publicationDate: entry.published,
    doi: entry['arxiv:doi']?.['_'] || entry['arxiv:doi'] || null,
    source: 'arXiv',
    url: Array.isArray(entry.link) ? entry.link.find(l => l.$?.title === 'pdf')?.$?.href || entry.id : entry.id
  })).filter(paper => paper.title);
}

module.exports = { searchArxiv };
