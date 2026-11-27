const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, valid email, and an 8-character password are required' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email is already registered' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) { next(error); }
});

router.get('/profile', auth, async (req, res, next) => {
  try { const user = await User.findById(req.user.id); res.json({ id: user._id, name: user.name, email: user.email }); }
  catch (error) { next(error); }
});

router.put('/profile', auth, async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A name and valid email address are required.' });
    }
    const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (existing) return res.status(409).json({ message: 'That email address is already in use.' });
    const user = await User.findByIdAndUpdate(req.user.id, { name, email }, { new: true, runValidators: true });
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (error) { next(error); }
});

module.exports = router;
