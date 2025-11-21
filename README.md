# Chat App (Flutter) + Minimal Backend

This repository contains a minimal Flutter chat client and a small Node.js backend (WebSocket + REST) for testing.

Quick start

1. Start backend

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:3000` and WebSocket at `ws://localhost:3000`.

2. Run Flutter client

Make sure you have Flutter installed. From project root:

```bash
flutter pub get
flutter run
```

The app connects to `ws://localhost:3000` and fetches history from `http://localhost:3000/history`.

Notes

- This is a minimal sample for local development and learning. It stores messages in memory (no DB).
- If you want authentication, persistence, or production-ready features, I can help add them.
