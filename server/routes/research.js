const router = require('express').Router();
const auth = require('../middleware/auth');
const ResearchProject = require('../models/ResearchProject');
const ResearchPaper = require('../models/ResearchPaper');
const AcademicPaper = require('../models/AcademicPaper');
const User = require('../models/User');
const { searchArxiv } = require('../services/arxiv');
const { verifyDoi } = require('../services/crossref');
const { chatJson } = require('../services/openrouter');
const { generateLatex } = require('../services/latex');

router.use(auth);

function rankRelevantSources(project, papers) {
  const stopWords = new Set([
    'about', 'after', 'against', 'among', 'and', 'artificial', 'based', 'being',
    'between', 'computer', 'data', 'develop', 'development', 'for', 'from', 'have',
    'into', 'learning', 'machine', 'model', 'more', 'other', 'platform', 'provide',
    'research', 'system', 'that', 'their', 'through', 'using', 'with', 'within'
  ]);
  const input = [
    project.title,
    project.topic,
    ...(project.keywords || []),
    ...(project.objectives || [])
  ].join(' ').toLowerCase();
  const terms = new Set(input.match(/[a-z0-9]{4,}/g)?.filter(term => !stopWords.has(term)) || []);
  const interviewFocus = /interview|mock interview|placement preparation|career readiness|hiring/.test(input);
  return papers.map(paper => {
    const title = (paper.title || '').toLowerCase();
    const abstract = (paper.abstract || '').toLowerCase();
    const text = `${title} ${abstract}`;
    const matches = [...terms].filter(term => text.includes(term));
    const titleMatches = matches.filter(term => title.includes(term)).length;
    const aiInterviewTitle = /\bai\b.{0,80}\b(interview|interviewer|mock|preparation|candidate)\b|\b(interview|interviewer|mock|preparation|candidate)\b.{0,80}\bai\b/.test(title);
    const aiEmploymentTitle = /\bai\b.{0,80}\b(job postings?|hiring|recruitment|career)\b|\b(job postings?|hiring|recruitment|career)\b.{0,80}\bai\b/.test(title);
    const relevant = interviewFocus
      ? aiInterviewTitle || aiEmploymentTitle
      : matches.length >= 2 && titleMatches >= 1;
    return { paper, score: titleMatches * 3 + matches.length, relevant };
  }).filter(result => result.relevant)
    .sort((left, right) => right.score - left.score)
    .map(result => result.paper);
}

router.post('/create', async (req, res, next) => {
  try {
    const project = await ResearchProject.create({ ...req.body, userId: req.user.id });
    res.status(201).json(project);
  } catch (error) { next(error); }
});

router.post('/analyze', async (req, res, next) => {
  try {
    const { title, topic, domain, projectId } = req.body;
    const analysis = await chatJson(
      `Analyze this research topic. Return JSON with keys concepts (3 brief items), keywords (5 items), searchQueries (3 short queries). Topic: ${JSON.stringify({ title, topic, domain })}`,
      800
    );
    if (projectId) {
      const project = await ResearchProject.findOne({ _id: projectId, userId: req.user.id });
      if (!project) return res.status(404).json({ message: 'Project not found' });
      project.topicAnalysis = analysis;
      project.status = 'Researching';
      await project.save();
    }
    res.json(analysis);
  } catch (error) { next(error); }
});

router.post('/search-papers', async (req, res, next) => {
  try {
    const { projectId, query, limit = 12 } = req.body;
    if (!query) return res.status(400).json({ message: 'A search query is required' });
    const arxivResults = await searchArxiv(query, limit);
    for (const paper of arxivResults) {
      await AcademicPaper.updateOne(
        { title: paper.title, projectId },
        { $set: { ...paper, projectId } },
        { upsert: true }
      );
    }
    res.json(arxivResults);
  } catch (error) { next(error); }
});

router.post('/identify-gaps', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const project = await ResearchProject.findOne({ _id: projectId, userId: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    const papers = await AcademicPaper.find({ projectId }).limit(6).lean();
    const gaps = await chatJson(
      `Analyze only evidence in these papers. Return JSON with keys existingApproaches, limitations, unsolvedProblems, researchGaps, improvements, contributions; each value is an array of at most 3 short strings. State if evidence is insufficient. Topic: ${project.topic}. Papers: ${JSON.stringify(papers.map(p => ({ title: p.title, abstract: p.abstract?.slice(0, 250) })))}`
      , 1000
    );
    project.researchAnalysis = gaps;
    project.status = 'Analyzing';
    await project.save();
    res.json(gaps);
  } catch (error) { next(error); }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const project = await ResearchProject.findOne({ _id: projectId, userId: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.status = 'Generating';
    await project.save();
    const literature = await AcademicPaper.find({ projectId }).lean();
    const relevantSources = rankRelevantSources(project, literature);
    const sources = relevantSources.slice(0, project.referenceCount || 20);
    if (sources.length === 0) {
      project.status = 'Failed';
      await project.save();
      return res.status(422).json({ message: 'No sufficiently relevant academic sources were found. Refine the topic or keywords and search again.' });
    }
    const promptSources = sources.slice(0, 8);
    const lengthGuidance = {
      Short: 'Target about 700 words total: abstract 90, introduction 100, review 100, problem 70, gap 70, method 110, results 70, limitations 45, future work 45, conclusion 70.',
      Medium: 'Target about 1,300 words total: abstract 120, introduction 200, review 200, problem 100, gap 100, method 200, results 120, limitations 70, future work 70, conclusion 100.',
      Long: 'Target about 1,700 words total: abstract 150, introduction 260, review 260, problem 130, gap 130, method 260, results 150, limitations 90, future work 90, conclusion 130.'
    }[project.desiredLength] || 'Target about 1,300 words total with developed prose in every section.';
    const topicAnalysis = project.topicAnalysis || {};
    const gapAnalysis = project.researchAnalysis || {};
    const generated = await chatJson(
      `Write an IEEE-style research paper with substantive, topic-specific prose. ${lengthGuidance} Return JSON keys title, abstract, keywords, introduction, literatureReview, problemStatement, researchGap, objectives (3-5), methodology, results, limitations, futureScope, conclusion. Do not return headings without descriptions. Label results "Proposed evaluation (not conducted)"; state no experiment was performed. Use IEEE citations [1]-[${promptSources.length}] only for claims supported by the matching source below. Never invent studies or findings. Topic: ${project.title}. Domain: ${project.domain}. Objectives: ${JSON.stringify(project.objectives)}. Method: ${project.methodology}. Topic terms: ${JSON.stringify(topicAnalysis.keywords || [])}. Identified gaps: ${JSON.stringify(gapAnalysis.researchGaps || [])}. Relevant sources: ${JSON.stringify(promptSources.map((p, index) => ({ citation: `[${index + 1}]`, title: p.title, authors: p.authors, year: p.publicationDate?.slice(0, 4), abstract: p.abstract?.slice(0, 250), doi: p.doi, url: p.url })))}`
      , 2600
    );
    const requiredSections = ['abstract', 'introduction', 'literatureReview', 'problemStatement', 'researchGap', 'methodology', 'results', 'limitations', 'futureScope', 'conclusion'];
    const missingSections = requiredSections.filter(field => typeof generated[field] !== 'string' || generated[field].trim().length < 80);
    if (missingSections.length) {
      const error = new Error(`The AI response did not contain usable prose for: ${missingSections.join(', ')}. Please regenerate the paper.`);
      error.status = 502;
      throw error;
    }
    generated.objectives = Array.isArray(generated.objectives) && generated.objectives.length
      ? generated.objectives.map(String)
      : project.objectives;
    generated.keywords = Array.isArray(generated.keywords) && generated.keywords.length
      ? generated.keywords.map(String)
      : project.keywords;
    const verifiedSources = await Promise.all(sources.map(async (source) => ({
      source,
      verification: await verifyDoi(source.doi)
    })));
    const references = verifiedSources.map(({ source, verification }) => ({
      title: verification.verified && verification.title ? verification.title : source.title,
      authors: verification.verified && verification.authors?.length ? verification.authors : source.authors,
      year: verification.verified && verification.year ? String(verification.year) : source.publicationDate?.slice(0, 4),
      doi: source.doi,
      url: source.url,
      source: source.source,
      verified: verification.verified || source.source === 'arXiv'
    }));
    const user = await User.findById(req.user.id).select('name');
    const authorName = user?.name || 'Author';
    const paperContent = {
      ...generated,
      authorName,
      references,
      projectId,
      userId: req.user.id
    };
    paperContent.latexContent = generateLatex(paperContent);
    const existingPaper = await ResearchPaper.findOne({ projectId, userId: req.user.id }).lean();
    const versionContent = existingPaper ? Object.fromEntries([
      'title', 'authorName', 'abstract', 'keywords', 'introduction', 'literatureReview',
      'problemStatement', 'researchGap', 'objectives', 'methodology', 'results',
      'limitations', 'futureScope', 'conclusion', 'latexContent'
    ].map(field => [field, existingPaper[field]])) : paperContent;
    const paper = await ResearchPaper.findOneAndUpdate(
      { projectId, userId: req.user.id },
      { $set: paperContent, $push: { versions: { content: versionContent, createdAt: new Date() } } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    project.status = 'Completed';
    await project.save();
    res.status(201).json(paper);
  } catch (error) {
    await ResearchProject.updateOne({ _id: req.body.projectId, userId: req.user.id }, { status: 'Failed' });
    next(error);
  }
});

router.get('/projects', async (req, res) => {
  res.json(await ResearchProject.find({ userId: req.user.id }).sort({ updatedAt: -1 }));
});

router.get('/:id', async (req, res) => {
  const project = await ResearchProject.findOne({ _id: req.params.id, userId: req.user.id });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const paper = await ResearchPaper.findOne({ projectId: project._id });
  res.json({ project, paper });
});

router.put('/:id', async (req, res) => {
  const project = await ResearchProject.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, req.body, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
});

router.put('/paper/:paperId', async (req, res) => {
  const paper = await ResearchPaper.findOne({ _id: req.params.paperId, userId: req.user.id });
  if (!paper) return res.status(404).json({ message: 'Paper not found' });
  const editableFields = [
    'title', 'authorName', 'abstract', 'keywords', 'introduction', 'literatureReview',
    'problemStatement', 'researchGap', 'objectives', 'methodology', 'results',
    'limitations', 'futureScope', 'conclusion'
  ];
  const updates = {};
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
  }
  const oldContent = paper.toObject();
  const snapshot = Object.fromEntries([
    'title', 'authorName', 'abstract', 'keywords', 'introduction', 'literatureReview',
    'problemStatement', 'researchGap', 'objectives', 'methodology', 'results',
    'limitations', 'futureScope', 'conclusion', 'latexContent'
  ].map(field => [field, oldContent[field]]));
  const updatedContent = { ...oldContent, ...updates };
  updates.latexContent = req.body.sourceMode && typeof req.body.latexContent === 'string'
    ? req.body.latexContent
    : generateLatex(updatedContent);
  const updatedPaper = await ResearchPaper.findOneAndUpdate(
    { _id: req.params.paperId, userId: req.user.id },
    { $set: updates, $push: { versions: { content: snapshot, createdAt: new Date() } } },
    { returnDocument: 'after', runValidators: true }
  );
  res.json(updatedPaper);
});

router.delete('/:id', async (req, res) => {
  const project = await ResearchProject.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  await ResearchPaper.deleteMany({ projectId: project._id });
  await AcademicPaper.deleteMany({ projectId: project._id });
  res.status(204).end();
});

module.exports = router;
