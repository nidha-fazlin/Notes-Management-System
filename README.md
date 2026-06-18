# Notes Management System

A full-stack notes app with a React frontend and an Express backend using a file-backed embedded database.

## Project structure

- `frontend`: React + Vite client
- `backend`: Express API and persistent notes storage

## Features

- Create notes
- Edit notes
- Delete notes
- View full note details
- Search by title, content, or tags
- Filter by category
- Responsive UI

## Run locally

### Backend

```bash
cd backend
npm install
npm start
```

The API runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend.

## Production build

```bash
cd frontend
npm run build
```
