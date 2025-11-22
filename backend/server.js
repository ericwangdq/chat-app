const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Initialize SQLite database
const dbPath = path.join(__dirname, "chat.db");
const db = new Database(dbPath);

// Create tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      ts DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database initialized");

  // Create demo users if they don't exist
  createDemoUsers();
}

// Helper function to create demo users
function createDemoUsers() {
  const demoUsers = [
    { username: "alice", password: "password123" },
    { username: "bob", password: "password123" },
  ];

  const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)");

  demoUsers.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    insertUser.run(user.username, hashedPassword);
  });

  console.log("Demo users initialized: alice, bob (password: password123)");
}

initializeDatabase();

// Login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  const user = stmt.get(username);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, username: user.username });
});

// Register endpoint
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // Check if user already exists
  const checkStmt = db.prepare("SELECT username FROM users WHERE username = ?");
  const existingUser = checkStmt.get(username);

  if (existingUser) {
    return res.status(409).json({ error: "Username already exists" });
  }

  // Create new user
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const insertStmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    insertStmt.run(username, hashedPassword);

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// JWT middleware for REST endpoints
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// Get message history
app.get("/history", authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare("SELECT author, text, ts FROM messages ORDER BY id DESC LIMIT 200");
    const messages = stmt.all();
    res.json(messages);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch message history" });
  }
});

// Get all users
app.get("/users", authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare("SELECT id, username, created_at FROM users ORDER BY created_at DESC");
    const users = stmt.all();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  // Extract token from URL query parameter
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(1008, "Authentication required");
    console.log("Connection rejected: no token");
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      ws.close(1008, "Invalid token");
      console.log("Connection rejected: invalid token");
      return;
    }

    ws.username = decoded.username;
    console.log(`Client connected: ${ws.username}`);

    ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        // Use authenticated username instead of client-provided author
        const msg = {
          author: ws.username,
          text: parsed.text,
          ts: new Date().toISOString()
        };

        // Save message to database
        try {
          const insertStmt = db.prepare("INSERT INTO messages (author, text, ts) VALUES (?, ?, ?)");
          insertStmt.run(msg.author, msg.text, msg.ts);

          // Keep only last 200 messages
          const deleteOldStmt = db.prepare(`
            DELETE FROM messages
            WHERE id NOT IN (
              SELECT id FROM messages ORDER BY id DESC LIMIT 200
            )
          `);
          deleteOldStmt.run();
        } catch (dbError) {
          console.error("Error saving message:", dbError);
        }

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });
      } catch (e) {
        console.error("invalid message", e);
      }
    });

    ws.on("close", () => console.log(`Client disconnected: ${ws.username}`));
  });
});

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`Database location: ${dbPath}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  db.close();
  process.exit(0);
});
