const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const auth = require('../middleware/auth');
const ResearchPaper = require('../models/ResearchPaper');
const execFileAsync = promisify(execFile);

router.use(auth);

router.get('/latex/:paperId', async (req, res) => {
  const paper = await ResearchPaper.findOne({ _id: req.params.paperId, userId: req.user.id });
  if (!paper) return res.status(404).json({ message: 'Paper not found' });
  res.setHeader('Content-Disposition', 'attachment; filename="researchai-paper.tex"');
  res.type('text/plain').send(paper.latexContent);
});

router.post('/pdf/:paperId', async (req, res) => {
  const paper = await ResearchPaper.findOne({ _id: req.params.paperId, userId: req.user.id });
  if (!paper) return res.status(404).json({ message: 'Paper not found' });
  const generated = path.join(__dirname, '..', 'generated');
  const texPath = path.join(generated, `${paper._id}.tex`);
  fs.writeFileSync(texPath, paper.latexContent);
  const localTectonic = path.join(generated, 'tectonic', 'tectonic.exe');
  const tectonicCommand = process.env.TECTONIC_PATH ||
    (process.platform === 'win32' && fs.existsSync(localTectonic) ? localTectonic : process.platform === 'win32' ? 'tectonic.exe' : 'tectonic');
  const compilers = [
    { command: process.platform === 'win32' ? 'pdflatex.exe' : 'pdflatex', args: ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', generated, texPath] },
    { command: tectonicCommand, args: ['--outdir', generated, texPath] }
  ];
  let compileError;
  for (const compiler of compilers) {
    try {
      await execFileAsync(compiler.command, compiler.args, { timeout: 120000, windowsHide: true });
      const pdfPath = path.join(generated, `${paper._id}.pdf`);
      paper.pdfPath = pdfPath;
      await paper.save();
      return res.download(pdfPath, 'researchai-paper.pdf');
    } catch (error) {
      if (error.code === 'ENOENT') {
        compileError = error;
        continue;
      }
      console.error(`LaTeX compilation failed for paper ${paper._id}:`, error.stderr || error.message);
      return res.status(422).json({
        message: 'LaTeX compilation failed. Install the IEEEtran class and required LaTeX packages, then try again.'
      });
    }
  }
  res.status(503).json({
    message: 'PDF export needs a LaTeX compiler. Install MiKTeX or TeX Live (pdflatex), or install Tectonic, then restart the server.',
    details: compileError?.code
  });
});

module.exports = router;
