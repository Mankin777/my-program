const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

/* =========================
   SAFE UPLOAD FOLDER
========================= */
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* =========================
   COLORS
========================= */
const colors = ["Red", "Purple", "White", "Pink", "Green", "Yellow"];

/* =========================
   ADMIN PASSWORD
========================= */
const ADMIN_PASSWORD = "admin123";

/* =========================
   DB CONNECTION (IMPORTANT FIX)
========================= */

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not set in environment variables");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB Error:", err);
    process.exit(1);
  });

/* =========================
   SCHEMAS
========================= */
const playerSchema = new mongoose.Schema({
  name: String,
  normalizedName: String,
  zones: String,
  ip: String,
  color: String,
  colorIndex: Number,
  createdAt: { type: Date, default: Date.now }
});

const Player = mongoose.model("Player", playerSchema);

const partnershipSchema = new mongoose.Schema({
  name: String,
  amount: Number,
  proof: String,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

const Partnership = mongoose.model("Partnership", partnershipSchema);

/* =========================
   UPLOAD
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

/* =========================
   🎡 SPIN WHEEL ENDPOINT (ADD THIS!)
========================= */
app.post("/play", async (req, res) => {
  try {
    const { name, zones } = req.body;
    
    if (!name || !zones) {
      return res.status(400).json({ error: "Name and zone are required" });
    }
    
    // Get client IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Randomly select a color from the colors array
    const randomIndex = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[randomIndex];
    
    // Save player data to database
    const player = new Player({
      name: name,
      normalizedName: name.toLowerCase(),
      zones: zones,
      ip: ip,
      color: selectedColor,
      colorIndex: randomIndex
    });
    
    await player.save();
    
    // Return the result to the frontend
    res.json({
      success: true,
      name: name,
      zones: zones,
      color: selectedColor,
      index: randomIndex,
      message: "Spin successful!"
    });
    
  } catch (err) {
    console.error("Error in /play:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ADMIN LOGIN
========================= */
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false });
});

/* =========================
   GET ALL PLAYERS (ADMIN)
========================= */
app.get("/api/players", async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   RESET GAME (DELETE ALL PLAYERS)
========================= */
app.delete("/api/admin/players", async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ success: true, message: "All players deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ADD NEW COLOR (ADMIN)
========================= */
app.post("/api/admin/colors", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Color name required" });
    }
    
    // Add to colors array
    colors.push(name);
    
    res.json({ 
      success: true, 
      colors: colors,
      message: `Color "${name}" added successfully!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   GET CURRENT COLORS LIST
========================= */
app.get("/api/colors", (req, res) => {
  res.json({ colors: colors });
});

/* =========================
   PARTNERSHIP ROUTES
========================= */

app.post("/api/partnership", upload.single("proof"), async (req, res) => {
  try {
    const record = new Partnership({
      name: req.body.name,
      amount: req.body.amount,
      proof: req.file ? req.file.filename : null
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
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎨 Available colors: ${colors.join(", ")}`);
  console.log(`🔐 Admin password: ${ADMIN_PASSWORD}`);
});