import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5103;

app.get("/health", (_req, res) => res.json({ ok: true, service: "support-service" }));

app.get("/support/customers/:customerId/tickets", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, customer_id AS "customerId", title, severity, status, summary,
            created_at AS "createdAt", last_updated_at AS "lastUpdatedAt"
       FROM support_tickets WHERE customer_id = $1
       ORDER BY CASE severity
                  WHEN 'high' THEN 1
                  WHEN 'medium' THEN 2
                  WHEN 'low' THEN 3
                  ELSE 4
                END`,
    [req.params.customerId]
  );
  res.json(rows);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`support-service listening on ${PORT}`));
});
