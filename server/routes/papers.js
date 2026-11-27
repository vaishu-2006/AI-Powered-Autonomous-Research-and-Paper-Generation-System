const router = require('express').Router();
const auth = require('../middleware/auth');
const AcademicPaper = require('../models/AcademicPaper');

router.use(auth);
router.get('/search', async (req, res) => {
  const { q = '', year = '' } = req.query;
  const filter = {};
  if (q) filter.$or = [{ title: new RegExp(q, 'i') }, { authors: new RegExp(q, 'i') }];
  if (year) filter.publicationDate = new RegExp(`^${year}`);
  res.json(await AcademicPaper.find(filter).sort({ publicationDate: -1 }).limit(100));
});
router.get('/:id', async (req, res) => {
  const paper = await AcademicPaper.findById(req.params.id);
  if (!paper) return res.status(404).json({ message: 'Academic paper not found' });
  res.json(paper);
});

module.exports = router;
