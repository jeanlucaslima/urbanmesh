import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5106;

app.get("/health", (_req, res) => res.json({ ok: true, service: "census-service" }));

app.get("/census/blocks/:blockId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT block_id        AS "blockId",
            population,
            median_income   AS "medianIncome",
            housing_density AS "housingDensity"
       FROM census_profiles WHERE block_id = $1`,
    [req.params.blockId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`census-service listening on ${PORT}`));
});
