import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5104;

app.get("/health", (_req, res) => res.json({ ok: true, service: "usage-service" }));

app.get("/usage/customers/:customerId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT customer_id AS "customerId",
            active_users AS "activeUsers",
            api_calls_last_30_days AS "apiCallsLast30Days",
            usage_trend AS "usageTrend",
            last_login_at AS "lastLoginAt",
            feature_adoption_score AS "featureAdoptionScore"
       FROM usage_summaries WHERE customer_id = $1`,
    [req.params.customerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`usage-service listening on ${PORT}`));
});
