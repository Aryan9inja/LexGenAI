# LexGen AI

An AI-powered legal contract generation and risk analysis platform. Generate legally structured contracts from plain language descriptions, then review clause-level risk insights before signing.

## Features

- **AI Contract Drafting** - Describe your needs in plain language to generate professionally structured contracts
- **Risk & Ambiguity Detection** - Automatically flags risky, vague, or potentially unfavorable clauses
- **Safer Alternatives** - Provides recommended clause replacements with clear explanations
- **RAG-Powered** - Uses Retrieval-Augmented Generation with legal templates for better accuracy
- **Interactive Q&A** - Asks clarifying questions to ensure complete contracts

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- MongoDB with Vector Search (Atlas)
- Gemini API via the OpenAI-compatible client
- JWT authentication with HTTP-only cookies

### Frontend
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion animations

## Project Structure

```
Enigma2026/
├── Backend/
│   └── src/
│       ├── controllers/     # Request handlers
│       ├── services/        # Business logic (AI, documents, auth)
│       ├── Models/          # MongoDB schemas
│       ├── routes/          # API routes
│       ├── middlewares/     # Auth middleware
│       └── utils/           # Logger utilities
├── frontend/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   └── lib/                 # Utilities, API client, auth context
└── templates/               # Legal document templates for RAG
```

## Setup

### Prerequisites
- Node.js 20+
- pnpm
- MongoDB Atlas account
- Gemini API key from Google AI Studio

### Environment Variables

**Backend (.env)**
```env
PORT=5000
MONGO_URI=mongodb+srv://...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_BATCH_SIZE=10
EMBEDDING_BATCH_DELAY_MS=30000
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
TOP_K_RETRIEVAL=5
```

This project originally used the OpenAI API while development credits were available. It now uses the Gemini API free tier through Gemini's OpenAI-compatible endpoint. `gemini-2.5-flash` is the stable default general-purpose model; `gemini-3-flash-preview` can be used via `GEMINI_MODEL` if you want the newer preview model. Embeddings use `gemini-embedding-001` and are generated on backend startup with conservative batching for free-tier reliability.

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Installation

```bash
# Backend
cd Backend
pnpm install
pnpm dev

# Frontend (new terminal)
cd frontend
pnpm install
pnpm dev
```

### MongoDB Atlas Vector Index

Create a vector search index in Atlas for RAG functionality:

1. Go to MongoDB Atlas → Your Cluster → Atlas Search
2. Create Search Index → JSON Editor
3. Database: `Enigma2026`, Collection: `templatechunks`
4. Index Name: `template_vector_index`
5. Definition:
```json
{
  "fields": [{
    "type": "vector",
    "path": "embedding",
    "numDimensions": 1536,
    "similarity": "cosine"
  }]
}
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents/create` - Create new document
- `POST /api/documents/generate` - Generate contract
- `POST /api/documents/analyze-risk` - Analyze risks
- `POST /api/documents/apply-suggestion` - Apply risk fix
- `POST /api/documents/apply-all-suggestions` - Apply all fixes

## Deployment

### Production (Azure VM / VPS)

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs nginx
npm install -g pnpm pm2

# Clone and setup
git clone <repo> && cd Enigma2026

# Backend
cd Backend && pnpm install
pm2 start "pnpm start" --name backend

# Frontend
cd ../frontend && pnpm install && pnpm build
pm2 start "pnpm start" --name frontend

# Nginx reverse proxy
sudo nano /etc/nginx/sites-available/lexgen
# Configure proxy_pass for / -> localhost:3000 and /api -> localhost:5000
sudo ln -s /etc/nginx/sites-available/lexgen /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## License

MIT

## Usage

### Generating a Contract
1. Register or log in via the frontend.
2. Navigate to the dashboard and select 'Create New Document'.
3. Describe your contract requirements in plain language.
4. Click 'Generate Contract' to receive a structured legal draft.

### Analyzing Risks
1. After generating a contract, click 'Analyze Risks'.
2. The platform will highlight risky or ambiguous clauses.
3. Review flagged clauses and suggested safer alternatives.
4. Apply suggestions individually or all at once.

### Downloading PDF
1. Once satisfied, click 'Download PDF' to export your contract.
2. Save or share the document as needed.

### Example User Flow
- Create a consultancy agreement using a template.
- Analyze risks and apply safer clauses.
- Download the finalized contract for signing.
