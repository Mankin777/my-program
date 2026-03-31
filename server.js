const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

const colors = ["Red", "Green", "Purple", "Yellow", "White", "Pink"];
const ADMIN_PASSWORD = "ADMIN123";

// Store players
let players = {};

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid password" });
  }
});

// PLAY ROUTE
app.post("/play", (req, res) => {
    let { name, zone } = req.body;

    if (!name || !zone) {
        return res.json({ error: "Fill all fields!" });
    }

    // Case-sensitive handling (normalize spacing only)
    name = name.trim();
    zone = zone.trim();

    if (players[name]) {
        return res.json({
            error: "You have already played!",
            color: players[name].color
        });
    }

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    players[name] = {
        zone,
        color: randomColor
    };

    res.json({
        name,
        zone,
        color: randomColor
    });
});

// ADMIN VIEW
app.get("/players", (req, res) => {
    res.json(players);
});

// RESET (Admin only - simple version)
app.post("/reset", (req, res) => {
    players = {};
    res.json({ message: "All players cleared!" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});