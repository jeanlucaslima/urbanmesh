import express from "express";
import cors from "cors";
import { runGraphQL } from "./graphqlClient.js";
import { planQuery, CUSTOMER_SITUATION_QUERY } from "./mockAgent.js";
import { buildAnswer } from "./answerBuilder.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000;

app.get("/health", (_req, res) => res.json({ ok: true, service: "agent-orchestrator" }));

app.post("/run", async (req, res) => {
  try {
    const { task, customerId, actorRole } = req.body || {};
    if (!task || typeof task !== "string") {
      return res.status(400).json({ error: "task required" });
    }
    const planned = planQuery(task, customerId);
    const variables = {
      ...planned.variables,
      actorRole: actorRole || planned.variables.actorRole,
    };
    const data = await runGraphQL<any>(CUSTOMER_SITUATION_QUERY, variables);
    const answer = buildAnswer(data);

    res.json({
      answer,
      graphqlQuery: CUSTOMER_SITUATION_QUERY,
      graphqlVariables: variables,
      data,
      execution: data.customerSituation.execution,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "unknown_error" });
  }
});

app.listen(PORT, () => console.log(`agent-orchestrator listening on ${PORT}`));
