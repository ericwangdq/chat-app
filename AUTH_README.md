# Authentication Implementation

This document describes the JWT-based authentication system added to the chat app.

## Features

- Username/password authentication using JWT tokens
- Secure token storage using flutter_secure_storage
- Protected WebSocket and REST API endpoints
- Real username displayed in chat messages (server-enforced)
- Demo users pre-configured for testing

## Backend Changes (backend/server.js)

### New Dependencies

- `jsonwebtoken` - JWT token generation and verification
- `bcryptjs` - Password hashing

### New Endpoints

**POST /login**

- Request: `{ "username": "alice", "password": "password123" }`
- Response: `{ "token": "jwt-token...", "username": "alice" }`
- Returns JWT token valid for 24 hours

**POST /register** (optional)

- Request: `{ "username": "newuser", "password": "securepass" }`
- Response: `{ "token": "jwt-token...", "username": "newuser" }`
- Creates new user and returns JWT token

**GET /history** (protected)

- Requires `Authorization: Bearer <token>` header
- Returns message history for authenticated users

### WebSocket Authentication

- WebSocket connections now require token as query parameter: `ws://localhost:3000?token=<jwt-token>`
- Connection rejected if token is missing or invalid
- Username extracted from token and used as message author

### Demo Users

Two demo users are pre-configured:

- Username: `alice`, Password: `password123`
- Username: `bob`, Password: `password123`

### Security

- Passwords are hashed using bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- Message author is server-enforced (client cannot spoof)

## Flutter Changes

### New Files

**lib/auth_service.dart**

- Handles login/register API calls
- Manages secure token storage using flutter_secure_storage
- Provides logout functionality

**lib/login_screen.dart**

- Login UI with username/password fields
- Shows error messages for invalid credentials
- Navigates to chat screen on successful login

### Modified Files

**lib/main.dart**

- Changed initial route to LoginScreen instead of ChatScreen

**lib/chat_screen.dart**

- Now accepts `username` and `token` as required parameters
- Displays username in app bar
- Added logout button that clears token and returns to login
- Uses authenticated username from server messages

**lib/chat_service.dart**

- Added `token` as required parameter
- Sends token with WebSocket connection
- Includes Authorization header in REST API calls
- Removed `author` parameter from `sendMessage()` (server uses authenticated username)

**pubspec.yaml**

- Added `flutter_secure_storage: ^9.0.0` dependency

## Usage

### Start Backend

```bash
cd backend
npm install  # if not already done
npm start
```

### Run Flutter App

```bash
flutter pub get  # if not already done
flutter run
```

### Login

Use one of the demo accounts:

- Username: `alice` or `bob`
- Password: `password123`

Or register a new account using the register endpoint.

## Testing the API

### Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password123"}'
```

### Get History (with token)

```bash
TOKEN="your-jwt-token-here"
curl http://localhost:3000/history \
  -H "Authorization: Bearer $TOKEN"
```

## Security Notes

For production use, consider:

1. Change JWT_SECRET to a strong, random secret (use environment variable)
2. Use a real database instead of in-memory storage
3. Add password strength requirements
4. Implement rate limiting on login endpoint
5. Add refresh token mechanism
6. Use HTTPS/WSS for all connections
7. Add account lockout after failed login attempts

## Completed Changes

Backend (Node.js)

- Installed jsonwebtoken and bcryptjs packages
- Added POST /login endpoint for authentication
- Added POST /register endpoint for user registration
- Protected GET /history endpoint with JWT middleware
- Implemented WebSocket authentication via token query parameter
- Server now enforces real username in messages (backend/server.js:127-130)
- Created demo users: alice and bob (password: password123)

Flutter Client

- Added flutter_secure_storage dependency for secure token storage
- Created lib/auth_service.dart - handles login, token storage, and logout
- Created lib/login_screen.dart - login UI with username/password fields
- Updated lib/chat_service.dart - now requires JWT token for all operations
- Updated lib/chat_screen.dart - accepts username/token, shows logout button
- Updated lib/main.dart - starts with LoginScreen instead of ChatScreen

How It Works

1. User enters username and password on login screen
2. Client sends credentials to /login endpoint
3. Backend validates credentials and returns JWT token (valid 24h)
4. Token stored securely using flutter_secure_storage
5. WebSocket connects with token: ws://localhost:3000?token=<jwt>
6. REST API calls include Authorization: Bearer <token> header
7. Backend extracts username from token and uses it as message author
8. Users can logout, which clears token and returns to login screen

Test It

The backend is already running on http://localhost:3000. You can now:

flutter run

Login with:

- Username: alice or bob
- Password: password123

The chat messages will now display the authenticated username (enforced by the server, not the client).

I've also created AUTH_README.md with complete documentation of the authentication system, API endpoints, and security
considerations.
