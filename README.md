# where-is-clara

A web app to see where my mom is, while she's on a 4 month cruise around the world

## Local development

```bash
createdb whereisclara

# Backend
cd backend
pip install -r requirements.txt
export DATABASE_URL="postgresql://username:password@localhost:5432/whereisclara"
uvicorn app.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```