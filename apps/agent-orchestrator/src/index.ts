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

interface RunResponse {
  answer: string | null;
  query: string | null;
  variables: { id: string; actorRole: string } | null;
  data: unknown | null;
  executionMetadata: {
    servicesTouched: string[];
    blockedFields: string[];
    policyDecisions: Array<Record<string, unknown>>;
  } | null;
  validationError: { code: string; message: string } | null;
  graphQLErrors: unknown[] | null;
}

function emptyResponse(): RunResponse {
  return {
    answer: null,
    query: null,
    variables: null,
    data: null,
    executionMetadata: null,
    validationError: null,
    graphQLErrors: null,
  };
}

app.post("/run", async (req, res) => {
  try {
    const planned = plan(req.body?.task, req.body?.actorRole);
    const envelope = await runGraphQL<{ block: any }>(
      planned.query,
      planned.variables
    );

    if (envelope.errors?.length) {
      const body: RunResponse = {
        ...emptyResponse(),
        query: planned.query,
        variables: planned.variables,
        graphQLErrors: envelope.errors,
      };
      return res.status(502).json(body);
    }

    const block = envelope.data?.block ?? null;
    const metadata =
      (envelope.extensions?.executionMetadata as any) ?? {
        servicesTouched: [],
        blockedFields: [],
        policyDecisions: [],
      };

    const answer = buildAnswer(block, planned.actorRole, metadata);
    const body: RunResponse = {
      answer,
      query: planned.query,
      variables: planned.variables,
      data: envelope.data ?? null,
      executionMetadata: metadata,
      validationError: null,
      graphQLErrors: null,
    };
    return res.json(body);
  } catch (err) {
    if (err instanceof PlannerError) {
      const body: RunResponse = {
        ...emptyResponse(),
        validationError: { code: err.code, message: err.message },
      };
      return res.status(400).json(body);
    }
    console.error(err);
    const body: RunResponse = {
      ...emptyResponse(),
      validationError: {
        code: "internal_error",
        message: (err as Error).message || "unknown error",
      },
    };
    return res.status(500).json(body);
  }
});

app.listen(PORT, () =>
  console.log(`agent-orchestrator listening on ${PORT}`)
);
