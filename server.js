const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const mongoose = require("mongoose");
const multer = require("multer");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 🎨 Colors
const colors = ["Red", "Purple", "White", "Pink", "Green", "Yellow"];

// Admin password
const ADMIN_PASSWORD = "prolific2026";

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* =========================
   🧠 HELPER FUNCTIONS
========================= */

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, "").trim();
}

function isSimilarName(name1, name2) {
  return name1.includes(name2) || name2.includes(name1);
}

/* =========================
   🧱 PLAYER SCHEMA
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
   🤝 PARTNERSHIP SCHEMA
========================= */

const partnershipSchema = new mongoose.Schema({
  name: String,
  amount: Number,
  proof: String,
  status: {
    type: String,
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Partnership = mongoose.model("Partnership", partnershipSchema);

/* =========================
   📂 FILE UPLOAD
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

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
   🎡 PLAY ROUTE
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
    const playersFromSameIP = await Player.find({ ip: userIP });

    for (let player of playersFromSameIP) {
      if (isSimilarName(player.normalizedName, normalizedName)) {
        return res.json({
          error: "⚠️ You already played (same device detected)"
        });
      }
    }

    const existingSameZone = await Player.findOne({
      normalizedName,
      zones
    });

    if (existingSameZone) {
      return res.json({
        error: "⚠️ You already played in this zone"
      });
    }

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
      index: randomIndex
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   📊 PLAYER ADMIN ROUTES
========================= */

app.get("/api/players", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

app.delete("/api/admin/players", async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ message: "Game reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset game" });
  }
});

app.post("/api/admin/colors", (req, res) => {
  const { name } = req.body;
  colors.push(name);
  res.json({ message: `Added ${name}` });
});

/* =========================
   🤝 PARTNERSHIP ROUTES
========================= */

app.post("/api/partnership", upload.single("proof"), async (req, res) => {
  try {
    const record = new Partnership({
      name: req.body.name,
      amount: req.body.amount,
      proof: req.file ? req.file.path : null
    });

    await record.save();

    res.json({
      success: true,
      message: "Submission received"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/partnerships", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const records = await Partnership.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(records);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/partnership/:id", async (req, res) => {
  try {
    await Partnership.findByIdAndUpdate(req.params.id, {
      status: req.body.status
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   🚀 START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});