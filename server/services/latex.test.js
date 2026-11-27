const test = require('node:test');
const assert = require('node:assert/strict');
const { generateLatex } = require('./latex');

test('generates IEEE conference layout with paper sections and numeric references', () => {
  const latex = generateLatex({
    title: 'AI & Interview Preparation',
    authorName: 'Research Author',
    abstract: 'A substantive abstract.',
    keywords: ['artificial intelligence', 'interviews'],
    introduction: 'Prior work supports this direction [1].',
    objectives: ['Build the platform', 'Evaluate usability'],
    references: [{
      authors: ['A. Author'],
      title: 'An Interview Study',
      year: '2025',
      url: 'https://arxiv.org/abs/2501.00001',
      verified: true
    }]
  });

  assert.match(latex, /\\documentclass\[conference\]\{IEEEtran\}/);
  assert.match(latex, /\\begin\{IEEEkeywords\}/);
  assert.match(latex, /\\section\{Introduction\}/);
  assert.match(latex, /\\begin\{itemize\}/);
  assert.match(latex, /AI \\& Interview Preparation/);
  assert.match(latex, /\\bibitem\{ref1\}/);
  assert.match(latex, /Prior work supports this direction \[1\]/);
});
