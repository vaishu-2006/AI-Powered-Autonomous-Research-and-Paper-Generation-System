# ResearchAI

ResearchAI is a full-stack autonomous research paper generator built with React, Express, MongoDB, OpenRouter, arXiv, Crossref, and IEEE LaTeX.

## Requirements

- Node.js 20 or newer
- MongoDB Community Server or MongoDB Atlas
- Optional: MiKTeX, TeX Live, or Tectonic for real PDF compilation
- OpenRouter API key for AI analysis and writing

## Installation

```bash
cd researchai
npm install
npm run install:all
```

If running the project from this directory rather than a nested `researchai` folder, use `npm run install:all` directly.

Create the server environment file:

```bash
copy server\.env.example server\.env
```

Set `MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `CROSSREF_EMAIL`, and optionally `ARXIV_API_BASE_URL`.

## Run

Start MongoDB first, then use separate terminals:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## Workflow

1. Register or sign in.
2. Open **Create Paper**.
3. Enter the topic, domain, objectives, methodology, references, and optional PDF.
4. Generate the project. The server analyzes the topic, searches arXiv, verifies available DOI metadata with Crossref, identifies gaps, and generates a structured paper.
5. Open the project editor to preview or edit the document and LaTeX source.
6. Download the `.tex` source or request PDF compilation.

PDF export requires an actual LaTeX installation. On Windows, install MiKTeX and ensure `pdflatex` is available on PATH, or install Tectonic. For a project-local Tectonic binary, place `tectonic.exe` at `server/generated/tectonic/tectonic.exe`; otherwise ensure it is available on PATH. Restart the backend after installation. The server reports a setup message instead of replacing the PDF with an unsupported format.

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `POST /api/research/create`
- `POST /api/research/analyze`
- `POST /api/research/search-papers`
- `POST /api/research/identify-gaps`
- `POST /api/research/generate`
- `GET /api/research/projects`
- `GET /api/research/:id`
- `PUT /api/research/:id`
- `DELETE /api/research/:id`
- `POST /api/documents/upload`
- `GET /api/documents/:projectId`
- `POST /api/export/pdf/:paperId`
- `GET /api/export/latex/:paperId`
- `GET /api/papers/search`
- `GET /api/papers/:id`
