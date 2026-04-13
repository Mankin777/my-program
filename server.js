const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const colors = ["Red", "Green", "Purple", "Yellow", "White", "Pink"];
const ADMIN_PASSWORD = "admin123";

// Store players (changed to array for easier frontend display)
let players = [];

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid password" });
  }
});

// Get all players
app.get('/api/players', (req, res) => {
    res.json(players);
});

// Add new color
app.post('/api/admin/colors', (req, res) => {
    const { name, value } = req.body;
    colors.push(name);
    res.json({ message: `Added ${name}`, colors: colors });
});

// Delete all players
app.delete('/api/admin/players', (req, res) => {
    players = [];
    res.json({ message: "All players deleted" });
});

// PLAY ROUTE
app.post("/play", (req, res) => {
    let { name, zone } = req.body;

    if (!name || !zone) {
        return res.json({ error: "Fill all fields!" });
    }

    name = name.trim();
    zone = zone.trim();

    // Check if player already exists
    const existingPlayer = players.find(p => p.name === name);
    if (existingPlayer) {
        return res.json({
            error: "You have already played!",
            color: existingPlayer.color
        });
    }

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    players.push({
        name: name,
        zone: zone,
        color: randomColor
    });

    res.json({
        name,
        zone,
        color: randomColor
    });
});

// ADMIN VIEW (alternative endpoint)
app.get("/players", (req, res) => {
    res.json(players);
});

// RESET (Admin only - simple version)
app.post("/reset", (req, res) => {
    players = [];
    res.json({ message: "All players cleared!" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});