import express from "express";
import { pool, waitForDb } from "./db.js";

const app = express();
const PORT = 5102;

app.get("/health", (_req, res) => res.json({ ok: true, service: "billing-service" }));

app.get("/billing/:customerId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT customer_id AS "customerId",
            billing_status AS "billingStatus",
            unpaid_invoice_count AS "unpaidInvoiceCount",
            unpaid_amount AS "unpaidAmount",
            payment_method_last4 AS "paymentMethodLast4",
            internal_finance_notes AS "internalFinanceNotes",
            risk_score AS "riskScore"
       FROM billing WHERE customer_id = $1`,
    [req.params.customerId]
  );
  if (rows.length === 0) return res.status(404).json({ error: "not_found" });
  const row = rows[0];
  if (row.unpaidAmount !== null && row.unpaidAmount !== undefined) {
    row.unpaidAmount = Number(row.unpaidAmount);
  }
  res.json(row);
});

waitForDb().then(() => {
  app.listen(PORT, () => console.log(`billing-service listening on ${PORT}`));
});
