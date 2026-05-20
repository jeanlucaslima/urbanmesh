import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5102;

app.get("/health", (_req, res) => res.json({ ok: true, service: "permits-service" }));

app.get("/permits/:blockId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT block_id                AS "blockId",
            active_permits          AS "activePermits",
            recent_permits          AS "recentPermits",
            estimated_project_value AS "estimatedProjectValue",
            compliance_risk         AS "complianceRisk"
       FROM permits WHERE block_id = $1`,
    [req.params.blockId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  const row = rows[0];
  if (row.estimatedProjectValue !== null && row.estimatedProjectValue !== undefined) {
    row.estimatedProjectValue = Number(row.estimatedProjectValue);
  }
  res.json(row);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`permits-service listening on ${PORT}`));
});
