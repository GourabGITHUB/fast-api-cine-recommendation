# astris

AI-powered movie recommendations using **FastAPI**, **Gemini**, **Redis**, and **React + Vite**.

## Structure

* `app/` — FastAPI backend, Gemini integration, Redis caching, rate limiting
* `frontend/` — React + TypeScript frontend
* `requirements.txt` — Python dependencies

## Run locally

### Backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set the required environment variables in `.env`:

```env
GEMINI_API_KEY=
REDIS_HOST=
REDIS_PORT=
```

The frontend uses `VITE_API_URL` to connect to the backend.

## Deployment

* Backend: Render Web Service
* Frontend: Render Static Site
* Cache: Render Key Value (Redis)

