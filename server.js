const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const mongoose = require('mongoose');

app.use(express.json());
app.use(express.static("public"));

const colors = ["Red", "Green", "Purple", "Yellow", "White", "Pink"];
const ADMIN_PASSWORD = "admin123";

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Error:", err));

// ✅ Schema FIRST
const playerSchema = new mongoose.Schema({
  name: String,
  zones: String,
  color: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Player = mongoose.model("Player", playerSchema);

// ✅ Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// ✅ Play route (MongoDB save)
app.post("/play", async (req, res) => {
  const { name, zones } = req.body;

  if (!name || !zones) {
    return res.json({ error: "Missing fields" });
  }

  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    const player = new Player({
      name,
      zones,
      color: randomColor
    });

    await player.save();

    res.json({
      name,
      zones,
      color: randomColor
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save player" });
  }
});

// ✅ Get players
app.get("/api/players", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// ✅ Reset players
app.delete("/api/admin/players", async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ message: "Game reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset game" });
  }
});

// ✅ Add new color
app.post('/api/admin/colors', (req, res) => {
  const { name } = req.body;
  colors.push(name);
  res.json({ message: `Added ${name}` });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});