const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: String,
  authorName: String,
  abstract: String,
  keywords: [String],
  introduction: String,
  literatureReview: String,
  problemStatement: String,
  researchGap: String,
  objectives: [String],
  methodology: String,
  results: String,
  limitations: String,
  futureScope: String,
  conclusion: String,
  references: [{ title: String, authors: [String], year: String, doi: String, url: String, source: String, verified: Boolean }],
  latexContent: String,
  pdfPath: String,
  versions: [{ content: mongoose.Schema.Types.Mixed, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

module.exports = mongoose.model('ResearchPaper', paperSchema);
