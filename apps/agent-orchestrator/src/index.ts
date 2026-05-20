import express from "express";
import cors from "cors";
import { runGraphQL } from "./graphqlClient.js";
import { plan, PlannerError } from "./planner.js";
import { buildAnswer } from "./answerBuilder.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5005;

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "agent-orchestrator" })
);

app.post("/run", async (req, res) => {
  try {
    const planned = plan(req.body?.task, req.body?.actorRole);
    const envelope = await runGraphQL<{ customer: any }>(
      planned.query,
      planned.variables
    );

    if (envelope.errors?.length) {
      return res.status(502).json({
        error: "graph_error",
        message: "The graph returned errors.",
        details: envelope.errors,
      });
    }

    const customer = envelope.data?.customer ?? null;
    const metadata =
      (envelope.extensions?.executionMetadata as any) ?? {
        servicesTouched: [],
        blockedFields: [],
        policyDecisions: [],
      };

    const answer = buildAnswer(customer, planned.actorRole, metadata);

    res.json({
      answer,
      query: planned.query,
      variables: planned.variables,
      data: envelope.data,
      executionMetadata: metadata,
    });
  } catch (err) {
    if (err instanceof PlannerError) {
      return res
        .status(400)
        .json({ error: err.code, message: err.message });
    }
    console.error(err);
    return res.status(500).json({
      error: "internal_error",
      message: (err as Error).message || "unknown error",
    });
  }
});

app.listen(PORT, () =>
  console.log(`agent-orchestrator listening on ${PORT}`)
);
