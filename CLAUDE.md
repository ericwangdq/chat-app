# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a minimal Flutter chat application with a Node.js WebSocket backend for local development and learning. The app demonstrates real-time messaging using WebSockets, REST API integration, and SQLite persistence.

**Key characteristics:**
- SQLite database for persistent storage (users and messages)
- User registration and authentication with JWT tokens
- Messages limited to 200 in history (older messages automatically deleted)
- Hardcoded connection to localhost:3000
- Secure password hashing with bcrypt

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
The Flutter app follows a multi-screen architecture:

1. **lib/main.dart** - App entry point, MaterialApp configuration
2. **lib/login_screen.dart** - Login UI with username/password fields
   - Links to registration screen
   - Shows demo user credentials
3. **lib/register_screen.dart** - Registration UI
   - Username validation (min 3 characters)
   - Password validation (min 6 characters)
   - Password confirmation
4. **lib/auth_service.dart** - Authentication service layer
   - Handles login and registration API calls
   - Secure token storage using flutter_secure_storage
   - Token management for authenticated requests
5. **lib/chat_screen.dart** - Main chat UI with StatefulWidget
   - Displays current username in app bar
   - Logout button to return to login screen
   - Manages message list state
   - Handles WebSocket stream subscription
   - Fetches message history on init
   - Messages displayed in reverse ListView (newest at top)
6. **lib/chat_service.dart** - Chat service layer for backend communication
   - WebSocket connection management with JWT token
   - REST API calls (GET /history) with authentication headers
   - Message serialization/deserialization

### Backend Structure
Single-file Express + WebSocket server (backend/server.js):
- SQLite database (backend/chat.db) with two tables:
  - `users`: Stores user credentials with hashed passwords
  - `messages`: Stores chat messages (max 200, auto-pruned)
- Express REST endpoints:
  - POST /register: Create new user account
  - POST /login: Authenticate and receive JWT token
  - GET /history: Returns message history (requires authentication)
  - GET /users: Returns list of all registered users (requires authentication)
- WebSocket server with JWT authentication
  - Token passed as query parameter: ws://localhost:3000?token=...
  - Broadcasts messages to all connected clients
  - Automatically saves messages to SQLite database

### Communication Flow
1. User opens app → Sees login screen
2. User can login (existing user) or register (new user)
3. After successful authentication:
   - Client receives JWT token
   - Token stored securely on device
   - Navigates to chat screen
4. Chat screen initialization:
   - Connects to WebSocket with token as query parameter
   - Fetches message history via REST GET /history (with Bearer token)
5. Sending messages:
   - User types message → Client sends JSON over WebSocket
   - Backend validates token, adds authenticated username as author
   - Message saved to SQLite database
   - Backend broadcasts message to all connected clients
6. All authenticated clients receive messages via WebSocket stream
7. Logout → Clears stored token → Returns to login screen

### Message Format
```json
{
  "author": "string",
  "text": "string",
  "ts": "ISO8601 timestamp"
}
```

## Development Notes

- The Flutter app inserts new messages at index 0 (chat_screen.dart:49) for reverse chronological display
- WebSocket errors are silently caught (chat_service.dart:43-46)
- Backend uses CORS middleware for cross-origin requests
- JWT tokens expire after 24 hours
- Passwords are hashed with bcrypt (10 salt rounds)
- SQLite database location: backend/chat.db
- Demo users (alice, bob) are created automatically on server startup
- No reconnection logic - if WebSocket disconnects, app must be restarted
- Database automatically prunes messages to keep only the most recent 200
