const mongoose = require('mongoose');

const academicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  authors: [String],
  abstract: String,
  publicationDate: String,
  doi: String,
  source: String,
  url: String,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchProject', index: true },
  favorite: { type: Boolean, default: false }
}, { timestamps: true });

academicSchema.index({ title: 1, projectId: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('AcademicPaper', academicSchema);
