# web-app-start

A basic boilerplate for a web app with a React+Typescript frontend and a FastAPI+Python backend.

## Local development

```bash
createdb webappstart

# Backend
cd backend
pip install -r requirements.txt
export DATABASE_URL="postgresql://username:password@localhost:5432/webappstart"
uvicorn app.main:app --reload --port 8000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```