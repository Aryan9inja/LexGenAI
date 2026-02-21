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
- OpenAI GPT-4o-mini
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
- OpenAI API key

### Environment Variables

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
TOP_K_RETRIEVAL=5
```

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
