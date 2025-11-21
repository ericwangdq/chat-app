const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

const messages = [];
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// In-memory user storage (for demo purposes)
// In production, use a real database
const users = new Map();

// Helper function to create demo users
function initializeDemoUsers() {
  const demoUsers = [
    { username: "alice", password: "password123" },
    { username: "bob", password: "password123" },
  ];

  demoUsers.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    users.set(user.username, { username: user.username, password: hashedPassword });
  });
  console.log("Demo users initialized: alice, bob (password: password123)");
}

initializeDemoUsers();

// Login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = users.get(username);
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

// Register endpoint (optional, for creating new users)
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (users.has(username)) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  users.set(username, { username, password: hashedPassword });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, username });
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

app.get("/history", authenticateToken, (req, res) => {
  res.json(messages);
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
        messages.push(msg);
        // keep history small
        if (messages.length > 200) messages.shift();
        // broadcast
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
});
