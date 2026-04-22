const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const mongoose = require("mongoose");

app.use(express.json());
app.use(express.static("public"));

// 🎨 Colors (6 segments) - UPDATED ORDER
const colors = ["Purple", "White", "Pink", "Green", "Yellow", "Red"];

const ADMIN_PASSWORD = "admin123";

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* =========================
   🧠 HELPER FUNCTIONS
========================= */

// Normalize name (remove spaces + lowercase)
function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, "").trim();
}

// Check similarity (anti-cheat)
function isSimilarName(name1, name2) {
  return name1.includes(name2) || name2.includes(name1);
}

/* =========================
   🧱 SCHEMA
========================= */

const playerSchema = new mongoose.Schema({
  name: String,
  normalizedName: String,
  zones: String,
  ip: String,
  color: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Player = mongoose.model("Player", playerSchema);

/* =========================
   🔐 ADMIN LOGIN
========================= */

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

/* =========================
   🎡 PLAY ROUTE (ANTI-CHEAT)
========================= */

app.post("/play", async (req, res) => {
  const { name, zones } = req.body;

  if (!name || !zones) {
    return res.json({ error: "⚠️ Please fill all fields" });
  }

  const normalizedName = normalizeName(name);

  const userIP =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  try {
    // 🔍 1. Check same IP + similar name
    const playersFromSameIP = await Player.find({ ip: userIP });

    for (let player of playersFromSameIP) {
      if (isSimilarName(player.normalizedName, normalizedName)) {
        return res.json({
          error: "⚠️ You already played (same device detected)"
        });
      }
    }

    // 🔍 2. Check same name + same zone
    const existingSameZone = await Player.findOne({
      normalizedName,
      zones
    });

    if (existingSameZone) {
      return res.json({
        error: "⚠️ You already played in this zone"
      });
    }

    // 🎡 Spin result (0 to 5 index)
    const randomIndex = Math.floor(Math.random() * colors.length);
    const randomColor = colors[randomIndex];

    const player = new Player({
      name,
      normalizedName,
      zones,
      ip: userIP,
      color: randomColor
    });

    await player.save();

    res.json({
      success: true,
      name,
      zones,
      color: randomColor,
      index: randomIndex // 🔥 0=Red,1=White,2=Green,3=Yellow,4=Purple,5=Pink
    });

  } catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   📊 ADMIN ROUTES
========================= */

// Get players
app.get("/api/players", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// Reset players
app.delete("/api/admin/players", async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ message: "Game reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset game" });
  }
});

// Add new color
app.post("/api/admin/colors", (req, res) => {
  const { name } = req.body;
  colors.push(name);
  res.json({ message: `Added ${name}` });
});

/* =========================
   🚀 START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});