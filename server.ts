import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("study.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    condition TEXT,
    experience TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id TEXT,
    trial_index INTEGER,
    stimulus_id TEXT,
    decision TEXT,
    response_time INTEGER,
    correctness BOOLEAN,
    FOREIGN KEY(participant_id) REFERENCES participants(id)
  );

  CREATE TABLE IF NOT EXISTS stimuli (
    id TEXT PRIMARY KEY,
    language TEXT,
    code TEXT,
    explanation TEXT,
    isCorrect BOOLEAN,
    socialProof INTEGER,
    aiConfidence TEXT,
    isPractice BOOLEAN DEFAULT 0
  );
`);

// Ensure isPractice column exists (for existing databases)
try {
  db.prepare("ALTER TABLE stimuli ADD COLUMN isPractice BOOLEAN DEFAULT 0").run();
} catch (e) {
  // Column already exists, ignore
}

// Seed stimuli if empty
const stimuliCount = db.prepare("SELECT COUNT(*) as count FROM stimuli").get() as { count: number };
if (stimuliCount.count === 0) {
  const { STIMULI } = await import("./src/stimuli.ts");
  const insertStimulus = db.prepare(`
    INSERT INTO stimuli (id, language, code, explanation, isCorrect, socialProof, aiConfidence, isPractice)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction((items) => {
    for (const item of items) {
      insertStimulus.run(
        item.id,
        item.language,
        item.code,
        item.explanation,
        item.isCorrect ? 1 : 0,
        item.socialProof,
        item.aiConfidence,
        item.isPractice ? 1 : 0
      );
    }
  });
  transaction(STIMULI);
}

// One-time fix for practice trials if they were seeded incorrectly
db.prepare("UPDATE stimuli SET isPractice = 1 WHERE id LIKE 'practice_%'").run();

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post("/api/start-session", (req, res) => {
    const { id, condition, experience } = req.body;
    try {
      const stmt = db.prepare("INSERT OR IGNORE INTO participants (id, condition, experience) VALUES (?, ?, ?)");
      stmt.run(id, condition, experience);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to start session" });
    }
  });

  app.post("/api/submit-trial", (req, res) => {
    const { participant_id, trial_index, stimulus_id, decision, response_time, correctness } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO trials (participant_id, trial_index, stimulus_id, decision, response_time, correctness)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(participant_id, trial_index, stimulus_id, decision, response_time, correctness ? 1 : 0);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to submit trial" });
    }
  });

  app.get("/api/results", (req, res) => {
    try {
      const participants = db.prepare("SELECT * FROM participants").all();
      const trials = db.prepare("SELECT * FROM trials").all();
      res.json({ participants, trials });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  app.delete("/api/participants/:id", (req, res) => {
    const { id } = req.params;
    try {
      const deleteTrials = db.prepare("DELETE FROM trials WHERE participant_id = ?");
      const deleteParticipant = db.prepare("DELETE FROM participants WHERE id = ?");
      
      const transaction = db.transaction(() => {
        deleteTrials.run(id);
        deleteParticipant.run(id);
      });
      
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete participant" });
    }
  });

  app.get("/api/stimuli", (req, res) => {
    try {
      const stimuli = db.prepare("SELECT * FROM stimuli").all();
      res.json(stimuli.map((s: any) => ({
        ...s,
        isCorrect: !!s.isCorrect,
        isPractice: !!s.isPractice
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stimuli" });
    }
  });

  app.post("/api/stimuli/update", (req, res) => {
    const { id, explanation, isCorrect, aiConfidence, code, language, isPractice } = req.body;
    try {
      const stmt = db.prepare(`
        UPDATE stimuli 
        SET explanation = ?, isCorrect = ?, aiConfidence = ?, code = ?, language = ?, isPractice = ? 
        WHERE id = ?
      `);
      stmt.run(explanation, isCorrect ? 1 : 0, aiConfidence, code, language, isPractice ? 1 : 0, id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update stimulus" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
