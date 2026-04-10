const express = require("express");
const cors = require("cors");
const path = require("path");
const { getCost, getServices } = require("./awsCost");
const { authenticate, changePassword } = require("./userManager");

const app = express();
app.use(cors());
app.use(express.json()); // Essential for parse req.body

// Auth Routes
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });
  if (authenticate(username, password)) {
    res.json({ success: true, token: "dummy-token-because-no-jwt-needed-yet" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post("/api/change-password", (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  
  if (changePassword(username, oldPassword, newPassword)) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid current password" });
  }
});

// Middleware to extract AWS credentials from header
function getAwsCreds(req) {
  const accessKeyId = req.headers['x-aws-access-key'];
  const secretAccessKey = req.headers['x-aws-secret-key'];
  const region = req.headers['x-aws-region'];
  return { accessKeyId, secretAccessKey, region };
}

// API Routes
app.get("/api/services", async (req, res) => {
  try {
    const creds = getAwsCreds(req);
    const services = await getServices(creds);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/cost", async (req, res) => {
  try {
    const service = req.query.service;
    const start = req.query.start;
    const end = req.query.end;
    const creds = getAwsCreds(req);
    const data = await getCost(service, creds, start, end);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(3001, () => console.log("Backend running on 3001"));
