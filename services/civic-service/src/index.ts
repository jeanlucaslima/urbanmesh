import express from "express";
import { pool, waitForDb } from "./db.js";
import { fetchCivicSummary } from "./sf311.js";

const app = express();
const PORT = 5103;

app.get("/health", (_req, res) => res.json({ ok: true, service: "civic-service" }));

// Legacy raw-cases endpoint (still used as the fixture data source for the
// civic summary). Returns the seeded civic_cases rows for a given block.
app.get("/civic/blocks/:blockId/cases", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, block_id AS "blockId", title, severity, status, summary,
            created_at AS "createdAt", last_updated_at AS "lastUpdatedAt"
       FROM civic_cases WHERE block_id = $1
       ORDER BY CASE severity
                  WHEN 'high' THEN 1
                  WHEN 'medium' THEN 2
                  WHEN 'low' THEN 3
                  ELSE 4
                END`,
    [req.params.blockId]
  );
  res.json(rows);
});

// UrbanMesh civic summary endpoint. Tries live SF 311 (DataSF / Socrata
// dataset vw6y-z8j6) per SF311_MODE, falls back to fixture data from
// civic_cases. Always returns the summarized shape with a `source` field.
app.get("/blocks/:blockId/civic", async (req, res) => {
  try {
    const summary = await fetchCivicSummary(req.params.blockId, pool);
    res.json(summary);
  } catch (err) {
    console.error("civic summary failed:", err);
    res.status(500).json({ error: "civic_summary_failed" });
  }
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`civic-service listening on ${PORT}`));
});
