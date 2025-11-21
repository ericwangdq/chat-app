# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal Flutter chat application with a Node.js WebSocket backend for local development and learning. The app demonstrates real-time messaging using WebSockets and REST API integration.

**Key characteristics:**
- In-memory message storage (no database)
- Messages limited to 200 in history (older messages dropped)
- Hardcoded connection to localhost:3000
- Minimal authentication or production features

## Commands

### Backend (Node.js)
```bash
cd backend
npm install          # Install dependencies
npm start            # Start server on port 3000
```

The backend runs on `http://localhost:3000` with WebSocket at `ws://localhost:3000`.

### Flutter Client
```bash
flutter pub get      # Install Flutter dependencies
flutter run          # Run app (defaults to connected device/simulator)
flutter test         # Run tests
flutter build macos  # Build for macOS (or web, etc.)
```

## Architecture

### Flutter Client Structure
The Flutter app follows a simple three-file architecture:

1. **lib/main.dart** - App entry point, MaterialApp configuration
2. **lib/chat_screen.dart** - UI layer with StatefulWidget
   - Manages message list state
   - Handles WebSocket stream subscription
   - Fetches message history on init
   - Messages displayed in reverse ListView (newest at top)
3. **lib/chat_service.dart** - Service layer for backend communication
   - WebSocket connection management
   - REST API calls (GET /history)
   - Message serialization/deserialization

### Backend Structure
Single-file Express + WebSocket server (backend/server.js):
- Express REST endpoint: GET /history returns all messages
- WebSocket server broadcasts messages to all connected clients
- In-memory messages array (max 200 messages)

### Communication Flow
1. Client connects to WebSocket on startup
2. Client fetches message history via REST GET /history
3. User sends message → Client sends JSON over WebSocket
4. Backend receives message → Stores in memory → Broadcasts to all clients
5. All connected clients receive message via WebSocket stream

### Message Format
```json
{
  "author": "string",
  "text": "string",
  "ts": "ISO8601 timestamp"
}
```

## Development Notes

- The Flutter app inserts new messages at index 0 (chat_screen.dart:37) for reverse chronological display
- WebSocket errors are silently caught (chat_service.dart:35-36)
- Backend uses CORS middleware for cross-origin requests
- No reconnection logic - if WebSocket disconnects, app must be restarted
