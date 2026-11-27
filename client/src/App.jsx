import { BrowserRouter, Navigate, Route, Routes, Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LayoutDashboard, FilePlus2, Library as LibraryIcon, FolderKanban, Moon, Sun, LogOut,
  Search, Sparkles, Upload, Download, Save, ChevronRight, Menu, X, UserRound, FileCode2, RefreshCw
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

axios.defaults.baseURL = 'http://localhost:5000/api';

function useAuth() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('researchai-user')));
  const login = (payload) => {
    localStorage.setItem('researchai-token', payload.token);
    localStorage.setItem('researchai-user', JSON.stringify(payload.user));
    setUser(payload.user);
  };
  const logout = () => {
    localStorage.removeItem('researchai-token');
    localStorage.removeItem('researchai-user');
    setUser(null);
  };
  const updateUser = (nextUser) => {
    localStorage.setItem('researchai-user', JSON.stringify(nextUser));
    setUser(nextUser);
  };
  useEffect(() => {
    axios.interceptors.request.use(config => {
      const token = localStorage.getItem('researchai-token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }, []);
  return { user, login, logout, updateUser };
}

function Shell({ user, logout, children }) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const items = [
    [<LayoutDashboard size={19}/>, 'Dashboard', '/'],
    [<FilePlus2 size={19}/>, 'Create Paper', '/create'],
    [<FolderKanban size={19}/>, 'Projects', '/projects'],
    [<LibraryIcon size={19}/>, 'Library', '/library']
  ];
  return (
    <div className="app-shell">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><div className="brand-mark">R</div><span>ResearchAI</span><button className="mobile-close" onClick={() => setOpen(false)}><X/></button></div>
        <nav>{items.map(([icon, label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{icon}<span>{label}</span></Link>)}</nav>
        <button className="sidebar-bottom" onClick={logout}><LogOut size={18}/>Sign out</button>
      </aside>
      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)}><Menu/></button>
          <div className="topbar-search"><Search size={17}/><input placeholder="Search research..." /></div>
          <button className="icon-button" onClick={() => setDark(v => !v)}>{dark ? <Sun/> : <Moon/>}</button>
          <div className="user-menu">
            <button className="avatar" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}>{user?.name?.[0] || 'U'}</button>
            {profileOpen && <div className="user-dropdown">
              <strong>{user?.name}</strong><span>{user?.email}</span>
              <Link to="/profile" onClick={() => setProfileOpen(false)}><UserRound size={16}/>Profile settings</Link>
              <button onClick={logout}><LogOut size={16}/>Sign out</button>
            </div>}
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}

function Protected({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

function Login({ auth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const { data } = await axios.post(`/auth/${mode}`, form);
      auth.login(data);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || 'Unable to connect to the server.');
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">R</div><span>ResearchAI</span></div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p>{mode === 'login' ? 'Continue your research workspace.' : 'Start your autonomous research workspace.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Full name<input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></label>}
          <label>Email address<input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></label>
          <label>Password<input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} minLength={mode === 'register' ? 8 : 1} required /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}<ChevronRight size={18}/></button>
        </form>
        <button className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New to ResearchAI? Create account' : 'Already registered? Sign in'}
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [projects, setProjects] = useState([]);
  useEffect(() => { axios.get('/research/projects').then(r => setProjects(r.data)).catch(() => setProjects([])); }, []);
  const chart = [{ name: 'Mon', papers: 2 }, { name: 'Tue', papers: 4 }, { name: 'Wed', papers: 3 }, { name: 'Thu', papers: 6 }, { name: 'Fri', papers: 5 }, { name: 'Sat', papers: 8 }, { name: 'Sun', papers: 7 }];
  return (
    <>
      <div className="page-heading"><div><span className="eyebrow">Overview</span><h1>Research dashboard</h1></div><Link className="primary-button" to="/create"><FilePlus2 size={18}/>Create New Research Paper</Link></div>
      <div className="stat-grid">
        {[['Generated papers', projects.filter(p => p.status === 'Completed').length], ['Papers analyzed', projects.length * 8], ['In progress', projects.filter(p => p.status !== 'Completed').length], ['Saved projects', projects.length]].map(([label, value]) =>
          <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>Across your workspace</small></div>)}
      </div>
      <div className="dashboard-grid">
        <section className="card chart-card"><div className="card-heading"><div><span className="eyebrow">Activity</span><h2>Research statistics</h2></div></div>
          <ResponsiveContainer width="100%" height={260}><BarChart data={chart}><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="papers" fill="#6657d9" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
        </section>
        <section className="card"><div className="card-heading"><div><span className="eyebrow">Recent</span><h2>Projects</h2></div></div>
          <div className="project-list">{projects.length ? projects.slice(0,5).map(p => <Link key={p._id} to={`/projects/${p._id}`}><div><strong>{p.title}</strong><small>{p.domain}</small></div><span className={`status ${p.status.toLowerCase()}`}>{p.status}</span></Link>) : <div className="empty-state"><Sparkles/><strong>No projects yet</strong><span>Create your first research paper.</span></div>}</div>
        </section>
      </div>
    </>
  );
}

const domains = ['Artificial Intelligence','Machine Learning','Deep Learning','Data Science','Cybersecurity','Internet of Things','Cloud Computing','Blockchain','Computer Networks','Software Engineering','Other'];

function CreatePaper() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', topic: '', domain: domains[0], objectives: '', keywords: '', methodology: '', preferredFormat: 'IEEE', referenceCount: 20, desiredLength: 'Medium' });
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [pdf, setPdf] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [completedSteps, setCompletedSteps] = useState([]);
  const update = (key, value) => setForm(v => ({ ...v, [key]: value }));
  const completeStep = step => setCompletedSteps(steps => steps.includes(step) ? steps : [...steps, step]);
  const submit = async (event) => {
    event.preventDefault();
    setLoading('Creating project...');
    setError('');
    try {
      const payload = { ...form, topic: form.topic || form.title, title: form.title, objectives: form.objectives.split('\n').filter(Boolean), keywords: form.keywords.split(',').map(v => v.trim()).filter(Boolean) };
      let activeProjectId = projectId;
      if (!activeProjectId) {
        const { data: project } = await axios.post('/research/create', payload);
        activeProjectId = project._id;
        setProjectId(activeProjectId);
      } else {
        await axios.put(`/research/${activeProjectId}`, payload);
      }
      if (!completedSteps.includes('analysis')) {
        setLoading('Analyzing topic...');
        const { data: analysis } = await axios.post('/research/analyze', { ...payload, projectId: activeProjectId });
        setCompletedSteps(steps => [...steps, 'analysis']);
        if (analysis.searchQueries?.length) {
          sessionStorage.setItem(`researchai-queries-${activeProjectId}`, JSON.stringify(analysis.searchQueries.slice(0, 3)));
        }
      }
      if (!completedSteps.includes('literature')) {
        setLoading('Retrieving academic papers...');
        const searchQueries = JSON.parse(sessionStorage.getItem(`researchai-queries-${activeProjectId}`) || '[]');
        const queries = searchQueries.length ? searchQueries : [payload.topic];
        await Promise.all(queries.map(query => axios.post('/research/search-papers', {
          projectId: activeProjectId,
          query,
          limit: Math.ceil(payload.referenceCount / queries.length)
        })));
        completeStep('literature');
      }
      if (pdf && !completedSteps.includes('document')) {
        const data = new FormData();
        data.append('pdf', pdf);
        data.append('projectId', activeProjectId);
        await axios.post('/documents/upload', data);
        completeStep('document');
      }
      if (!completedSteps.includes('gaps')) {
        setLoading('Identifying gaps...');
        await axios.post('/research/identify-gaps', { projectId: activeProjectId });
        completeStep('gaps');
      }
      setLoading('Generating paper...');
      await axios.post('/research/generate', { projectId: activeProjectId });
      navigate(`/projects/${activeProjectId}`);
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      setLoading('');
    }
  };
  return (
    <div className="form-layout">
      <div><span className="eyebrow">New project</span><h1>Create research paper</h1><p className="muted">Configure the research scope, then ResearchAI will retrieve literature and generate a structured IEEE paper.</p></div>
      <form className="card form-card" onSubmit={submit}>
        <div className="form-grid">
          <label className="span-2">Paper title or topic<input value={form.title} onChange={e => update('title', e.target.value)} required placeholder="e.g. Federated Learning for Privacy..." /></label>
          <label>Research domain<select value={form.domain} onChange={e => update('domain', e.target.value)}>{domains.map(d => <option key={d}>{d}</option>)}</select></label>
          <label>Research methodology<select value={form.methodology} onChange={e => update('methodology', e.target.value)}><option value="">Select methodology</option><option>Systematic Literature Review</option><option>Experimental</option><option>Simulation-based</option><option>Survey</option><option>Conceptual</option></select></label>
          <label className="span-2">Research objectives<textarea rows="4" value={form.objectives} onChange={e => update('objectives', e.target.value)} placeholder="Enter one objective per line" /></label>
          <label>Keywords<input value={form.keywords} onChange={e => update('keywords', e.target.value)} placeholder="AI, privacy, federated learning" /></label>
          <label>References<input type="number" min="5" max="100" value={form.referenceCount} onChange={e => update('referenceCount', Number(e.target.value))}/></label>
          <label>Desired length<select value={form.desiredLength} onChange={e => update('desiredLength', e.target.value)}><option>Short</option><option>Medium</option><option>Long</option></select></label>
          <label>Publication format<select value={form.preferredFormat} onChange={e => update('preferredFormat', e.target.value)}><option>IEEE</option><option>Conference</option><option>Journal</option></select></label>
          <label className="span-2 upload-box"><Upload/><div><strong>Upload reference PDFs</strong><span>{pdf ? pdf.name : 'PDF, up to 15 MB'}</span></div><input type="file" accept=".pdf,application/pdf" onChange={e => setPdf(e.target.files[0])}/></label>
        </div>
        {error && <div className="error-box">{error}{projectId && <span> Your project is saved; retry to resume the unfinished steps.</span>}</div>}
        {loading && <div className="progress-box"><span className="spinner"/>{loading}</div>}
        <button className="primary-button" type="submit" disabled={!!loading}><Sparkles size={18}/>{loading || (projectId ? 'Retry research pipeline' : 'Generate Research Paper')}</button>
      </form>
    </div>
  );
}

const paperSections = [
  ['abstract', 'Abstract'],
  ['introduction', 'Introduction'],
  ['literatureReview', 'Literature Review'],
  ['problemStatement', 'Problem Statement'],
  ['researchGap', 'Research Gap'],
  ['objectives', 'Research Objectives'],
  ['methodology', 'Proposed Methodology'],
  ['results', 'Results and Discussion'],
  ['limitations', 'Limitations'],
  ['futureScope', 'Future Scope'],
  ['conclusion', 'Conclusion']
];

function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [paper, setPaper] = useState(null);
  const [pageError, setPageError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    axios.get(`/research/${id}`)
      .then(r => {
        if (!active) return;
        setProject(r.data.project);
        setPaper(r.data.paper);
        setPageError('');
      })
      .catch(error => {
        if (active) setPageError(error.response?.data?.message || 'Unable to load this research project.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const [sourceMode, setSourceMode] = useState(false);
  const updatePaper = (field, value) => setPaper(current => ({ ...current, [field]: value }));
  const save = async () => {
    if (!paper) return;
    setSaving(true);
    setNotice('');
    try {
      const { data } = await axios.put(`/research/paper/${paper._id}`, { ...paper, sourceMode });
      setPaper(data);
      setNotice('Changes saved.');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to save this paper.');
    } finally {
      setSaving(false);
    }
  };
  const downloadPdf = async () => {
    try {
      const r = await axios.post(`/export/pdf/${paper._id}`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(paper.title || 'research-paper').replace(/[^a-z0-9-_]+/gi, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = await getDownloadError(error);
      setNotice(message);
    }
  };
  const downloadLatex = async () => {
    try {
      const { data } = await axios.get(`/export/latex/${paper._id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(paper.title || 'research-paper').replace(/[^a-z0-9-_]+/gi, '-')}.tex`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to download LaTeX source.');
    }
  };
  const regenerate = async () => {
    setSaving(true);
    setNotice('');
    try {
      const { data } = await axios.post('/research/generate', { projectId: id });
      setPaper(data);
      setSourceMode(false);
      setNotice('Paper regenerated.');
    } catch (error) {
      setNotice(error.response?.data?.message || 'Unable to regenerate this paper.');
    } finally {
      setSaving(false);
    }
  };
  const wordCount = paperSections.reduce((total, [field]) => {
    const value = paper?.[field];
    return total + (Array.isArray(value) ? value.join(' ').split(/\s+/).filter(Boolean).length : String(value || '').split(/\s+/).filter(Boolean).length);
  }, 0);
  return (
    <>
      <div className="page-heading">
        <div><span className="eyebrow">{project?.domain || 'Research project'}</span><h1>{project?.title || 'Paper editor'}</h1><p className="muted">{wordCount.toLocaleString()} words · {paper?.references?.length || 0} references</p></div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => setSourceMode(value => !value)}><FileCode2 size={17}/>{sourceMode ? 'Paper editor' : 'LaTeX source'}</button>
          <button className="secondary-button" onClick={downloadLatex} disabled={!paper}><Download size={17}/> .tex</button>
          <button className="secondary-button" onClick={downloadPdf} disabled={!paper}><Download size={17}/> PDF</button>
          <button className="secondary-button" onClick={regenerate} disabled={saving}><RefreshCw size={17}/>Regenerate</button>
          <button className="primary-button" onClick={save} disabled={!paper || saving}><Save size={17}/>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </div>
      {notice && <div className={notice.includes('Unable') || notice.includes('Install') || notice.includes('failed') ? 'error-box editor-notice' : 'success-box editor-notice'}>{notice}</div>}
      {pageError && <div className="error-box">{pageError}</div>}
      {loading ? <div className="card empty-state"><span className="spinner"/>Loading paper…</div> :
        paper ? <div className="ieee-document card">
          <div className="ieee-title-block">
            <input aria-label="Paper title" className="ieee-title-input" value={paper.title || ''} onChange={event => updatePaper('title', event.target.value)}/>
            <input aria-label="Author name" className="ieee-author-input" value={paper.authorName || ''} onChange={event => updatePaper('authorName', event.target.value)}/>
          </div>
          {sourceMode ? <div className="editor-card"><Editor height="680px" language="latex" theme="vs-light" value={paper.latexContent || ''} onChange={value => updatePaper('latexContent', value || '')}/></div> :
            <>
              <EditorSection title="Abstract" value={paper.abstract} onChange={value => updatePaper('abstract', value)}/>
              <label className="keyword-editor">Index Terms<input value={(paper.keywords || []).join(', ')} onChange={event => updatePaper('keywords', event.target.value.split(',').map(value => value.trim()).filter(Boolean))}/></label>
              <div className="ieee-columns">
                {paperSections.slice(1).map(([field, title]) =>
                  <EditorSection key={field} title={title} value={paper[field]} onChange={value => updatePaper(field, field === 'objectives' ? value.split('\n').filter(Boolean) : value)} rows={field === 'objectives' ? 5 : 8}/>
                )}
              </div>
              {!!paper.references?.length && <section className="reference-editor"><h3>References</h3>{paper.references.map((reference, index) =>
                <div className="reference-row" key={`${reference.doi || reference.title}-${index}`}>
                  <span>[{index + 1}] {reference.authors?.join(', ')}. <em>{reference.title}</em>. {reference.year || ''}</span>
                  <span className={reference.verified ? 'verification verified' : 'verification'}>{reference.verified ? 'Source checked' : 'Unverified metadata'}</span>
                  {reference.url && <a href={reference.url} target="_blank" rel="noreferrer">Source</a>}
                </div>
              )}</section>}
            </>
          }
        </div> : <div className="card empty-state"><strong>Paper not generated</strong><span>{project?.status === 'Failed' ? 'Generation failed. Check project inputs and try regenerating.' : 'Generate the paper to populate the editor.'}</span><button className="primary-button" onClick={regenerate}>Generate paper</button></div>}
    </>
  );
}
function EditorSection({ title, value, onChange, rows = 8 }) {
  return <section className="paper-section"><h3>{title}</h3><textarea rows={rows} value={Array.isArray(value) ? value.join('\n') : value || ''} onChange={event => onChange(event.target.value)} /></section>;
}

async function getDownloadError(error) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      const payload = JSON.parse(await data.text());
      return payload.message || 'PDF export failed.';
    } catch {
      return 'PDF export failed. Verify the LaTeX compiler setup and try again.';
    }
  }
  return data?.message || 'PDF export failed.';
}

function Projects() {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    axios.get('/research/projects').then(r => setProjects(r.data)).catch(() => {});
  }, []);
  return <><div className="page-heading"><div><span className="eyebrow">Workspace</span><h1>Research projects</h1></div><Link className="primary-button" to="/create">Create project</Link></div><div className="card project-table">{projects.map(p => <Link key={p._id} to={`/projects/${p._id}`}><strong>{p.title}</strong><span>{p.domain}</span><span className="status">{p.status}</span><ChevronRight/></Link>)}{!projects.length && <div className="empty-state">No projects found.</div>}</div></>;
}

function Library() {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [papers, setPapers] = useState([]);
  const search = () => axios.get('/papers/search', { params: { q: query, year } }).then(r => setPapers(r.data)).catch(() => setPapers([]));
  useEffect(() => {
    search();
  }, []);
  return <><div className="page-heading"><div><span className="eyebrow">Academic sources</span><h1>Research library</h1></div></div><div className="library-tools"><div className="topbar-search"><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title or author"/></div><input className="year-input" value={year} onChange={e => setYear(e.target.value)} placeholder="Publication year"/><button className="primary-button" onClick={search}>Search</button></div><div className="paper-grid">{papers.map(p => <article className="card paper-card" key={p._id}><span className="source-badge">{p.source}</span><h3>{p.title}</h3><p>{p.abstract?.slice(0, 220)}{p.abstract?.length > 220 ? '...' : ''}</p><div><span>{p.authors?.join(', ')}</span>{p.url && <a href={p.url} target="_blank" rel="noreferrer">Open source</a>}</div></article>)}</div></>;
}

function Profile({ user, onUpdateUser }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    axios.get('/auth/profile').then(({ data }) => setForm({ name: data.name, email: data.email })).catch(error => {
      setMessage(error.response?.data?.message || 'Unable to load your profile.');
    });
  }, []);
  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await axios.put('/auth/profile', form);
      onUpdateUser(data);
      setForm({ name: data.name, email: data.email });
      setMessage('Profile saved.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save profile changes.');
    } finally {
      setSaving(false);
    }
  };
  return <div className="profile-layout">
    <div><span className="eyebrow">Account</span><h1>Profile settings</h1><p className="muted">Update the name and email shown on your research papers.</p></div>
    <form className="card profile-card" onSubmit={submit}>
      <div className="profile-avatar">{(form.name || 'U')[0].toUpperCase()}</div>
      <label>Full name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required/></label>
      <label>Email address<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required/></label>
      {message && <div className={message === 'Profile saved.' ? 'success-box' : 'error-box'}>{message}</div>}
      <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
    </form>
  </div>;
}

function App() {
  const auth = useAuth();
  return <BrowserRouter><Routes>
    <Route path="/login" element={auth.user ? <Navigate to="/"/> : <Login auth={auth}/>}/>
    <Route path="*" element={<Protected user={auth.user}><Shell user={auth.user} logout={auth.logout}><Routes>
      <Route path="/" element={<Dashboard/>}/>
      <Route path="/create" element={<CreatePaper/>}/>
      <Route path="/projects" element={<Projects/>}/>
      <Route path="/projects/:id" element={<ProjectPage/>}/>
      <Route path="/library" element={<Library/>}/>
      <Route path="/profile" element={<Profile user={auth.user} onUpdateUser={auth.updateUser}/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes></Shell></Protected>}/>
  </Routes></BrowserRouter>;
}

export default App;
