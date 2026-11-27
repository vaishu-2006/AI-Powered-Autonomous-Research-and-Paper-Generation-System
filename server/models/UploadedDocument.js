const mongoose = require('mongoose');

module.exports = mongoose.model('UploadedDocument', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject', required: true, index: true },
  originalName: { type: String, required: true },
  extractedText: String,
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}));
