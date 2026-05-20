import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5101;

app.get("/health", (_req, res) => res.json({ ok: true, service: "customer-service" }));

app.get("/customers/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, industry, plan, account_owner AS "accountOwner",
            health_score AS "healthScore", status, risk_level AS "riskLevel",
            created_at AS "createdAt"
       FROM customers WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  res.json(rows[0]);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`customer-service listening on ${PORT}`));
});
