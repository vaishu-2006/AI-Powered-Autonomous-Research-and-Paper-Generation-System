function escapeLatex(value = '') {
  const replacements = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}'
  };
  return String(value).replace(/[\\&%$#_{}~^]/g, character => replacements[character]);
}

function paragraphText(value = '') {
  return escapeLatex(value).replace(/\r?\n\r?\n/g, '\n\n\\par\n\n').replace(/\r?\n/g, '\\\\\n');
}

function generateLatex(paper) {
  const sections = [
    ['Introduction', paper.introduction],
    ['Related Work', paper.literatureReview],
    ['Problem Statement', paper.problemStatement],
    ['Research Gap', paper.researchGap],
    ['Research Objectives', Array.isArray(paper.objectives) ? paper.objectives.map(item => `\\item ${paragraphText(item)}`).join('\n') : paper.objectives],
    ['Proposed Methodology', paper.methodology],
    ['Results and Discussion', paper.results],
    ['Limitations', paper.limitations],
    ['Future Scope', paper.futureScope],
    ['Conclusion', paper.conclusion]
  ];
  const body = sections.map(([title, content]) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return '';
    const text = title === 'Research Objectives'
      ? `\\begin{itemize}\n${content}\n\\end{itemize}`
      : paragraphText(content);
    return `\\section{${escapeLatex(title)}}\n${text}`;
  }).join('\n\n');
  const references = (paper.references || []).map((reference, index) => {
    const authors = (reference.authors || []).join(', ');
    const doi = reference.doi ? ` DOI: \\href{https://doi.org/${escapeLatex(reference.doi)}}{${escapeLatex(reference.doi)}}.` : '';
    const url = reference.url ? ` Available: \\url{${reference.url}}.` : '';
    const validation = reference.verified ? '' : ' [Metadata not independently verified].';
    return '\\bibitem{ref' + (index + 1) + '} ' + escapeLatex(authors) +
      '. ``' + escapeLatex(reference.title || '') + ',\'\' ' +
      escapeLatex(reference.year || '') + '.' + doi + url + validation;
  }).join('\n');

  return `\\documentclass[conference]{IEEEtran}
\\usepackage[T1]{fontenc}
  \\usepackage[utf8]{inputenc}
\\usepackage{cite}
\\usepackage{url}
\\usepackage{hyperref}
\\usepackage{amsmath,amssymb}
\\title{${escapeLatex(paper.title || 'Untitled Research Paper')}}
\\author{\\IEEEauthorblockN{${escapeLatex(paper.authorName || 'Author')}}
\\IEEEauthorblockA{ResearchAI}}
\\begin{document}
\\maketitle
\\begin{abstract}
${paragraphText(paper.abstract || '')}
\\end{abstract}
\\begin{IEEEkeywords}
${escapeLatex((paper.keywords || []).join(', '))}
\\end{IEEEkeywords}
${body}
\\begin{thebibliography}{99}
${references || '\\bibitem{none} No academic sources were retrieved.'}
\\end{thebibliography}
\\end{document}`;
}

module.exports = { generateLatex };
