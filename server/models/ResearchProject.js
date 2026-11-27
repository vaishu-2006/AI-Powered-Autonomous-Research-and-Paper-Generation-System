const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  domain: { type: String, required: true },
  topic: { type: String, required: true },
  objectives: [String],
  keywords: [String],
  methodology: String,
  topicAnalysis: mongoose.Schema.Types.Mixed,
  researchAnalysis: mongoose.Schema.Types.Mixed,
  preferredFormat: { type: String, default: 'IEEE' },
  referenceCount: { type: Number, default: 20 },
  desiredLength: { type: String, default: 'Medium' },
  status: { type: String, enum: ['Draft', 'Researching', 'Analyzing', 'Generating', 'Completed', 'Failed'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('ResearchProject', projectSchema);
