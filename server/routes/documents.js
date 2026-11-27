const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const auth = require('../middleware/auth');
const UploadedDocument = require('../models/UploadedDocument');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-z0-9_.-]/gi, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf') });

router.use(auth);
router.post('/upload', upload.single('pdf'), async (req, res, next) => {
  let parser;
  try {
    if (!req.file) return res.status(400).json({ message: 'A PDF file is required' });
    parser = new PDFParse({ data: fs.readFileSync(req.file.path) });
    const parsed = await parser.getText();
    const document = await UploadedDocument.create({
      userId: req.user.id,
      projectId: req.body.projectId,
      originalName: req.file.originalname,
      extractedText: parsed.text,
      filePath: req.file.path
    });
    res.status(201).json(document);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  } finally {
    if (parser) await parser.destroy();
  }
});
router.get('/:projectId', async (req, res) => {
  res.json(await UploadedDocument.find({ projectId: req.params.projectId, userId: req.user.id }).sort({ uploadedAt: -1 }));
});

module.exports = router;
