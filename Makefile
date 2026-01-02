include backend/.env

run-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev

format:
	cd backend && black .
	cd frontend && npx prettier . --write

setup-db:
	createdb $(DATABASE_NAME)

.PHONY: run-backend run-frontend run setup-db
