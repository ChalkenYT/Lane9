import express from "express";
import cors from "cors";
import { importSwimmer } from "./scraper.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Lane9 backend running");
});

// Main import endpoint
app.post("/import", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing URL" });
    }

    const data = await importSwimmer(url);

    res.json({
      success: true,
      swims: data.length,
      data
    });

catch (err) {
  console.error("🔥 IMPORT ERROR FULL:", err);

  res.status(500).json({
    success: false,
    error: err.message,
    stack: err.stack?.split("\n").slice(0, 10)
  });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Lane9 backend running on ${PORT}`);
});
