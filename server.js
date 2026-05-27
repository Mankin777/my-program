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
   DB CONNECTION (FIXED)
========================= */
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/prolific")
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
   FILE UPLOAD
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

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
   PARTNERSHIP ROUTES
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
   START SERVER
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});