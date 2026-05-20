import express from "express";
import { check, PolicyInput } from "./rules.js";

const app = express();
app.use(express.json());

const PORT = 5105;

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "policy-service" })
);

app.post("/check", (req, res) => {
  const input = req.body as PolicyInput;
  if (!input?.actorRole || !input?.field) {
    return res.status(400).json({ error: "actorRole and field are required" });
  }
  res.json(check(input));
});

app.listen(PORT, () => console.log(`policy-service listening on ${PORT}`));
