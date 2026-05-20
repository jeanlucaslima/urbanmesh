import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5101;

app.get("/health", (_req, res) => res.json({ ok: true, service: "location-service" }));

app.get("/blocks/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, neighborhood,
            planning_status AS "planningStatus",
            planning_risk   AS "planningRisk",
            created_at      AS "createdAt"
       FROM city_blocks WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

app.get("/blocks/:id/zoning", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT block_id            AS "blockId",
            district,
            allowed_uses        AS "allowedUses",
            height_limit        AS "heightLimit",
            special_use_district AS "specialUseDistrict"
       FROM zoning WHERE block_id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`location-service listening on ${PORT}`));
});
