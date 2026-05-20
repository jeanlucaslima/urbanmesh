import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5104;

app.get("/health", (_req, res) => res.json({ ok: true, service: "transit-service" }));

app.get("/transit/blocks/:blockId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT block_id          AS "blockId",
            nearby_stops      AS "nearbyStops",
            access_score      AS "accessScore",
            ridership_trend   AS "ridershipTrend",
            last_observed_at  AS "lastObservedAt"
       FROM transit_summaries WHERE block_id = $1`,
    [req.params.blockId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`transit-service listening on ${PORT}`));
});
