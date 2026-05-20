import { useState } from "react";
import { runAgent, ActorRole, AgentRunResponse } from "./api";

const ROLES: ActorRole[] = [
  "AI_ASSISTANT",
  "SUPPORT_AGENT",
  "FINANCE_AGENT",
  "ADMIN",
];

const DEFAULT_TASK = "Explain customer C-1027 risk";

export default function App() {
  const [task, setTask] = useState(DEFAULT_TASK);
  const [actorRole, setActorRole] = useState<ActorRole>("AI_ASSISTANT");
  const [result, setResult] = useState<AgentRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await runAgent(task, actorRole);
      setResult(res);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || "The agent could not complete the request. Check service health and verification.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Viaduct Agent Demo</h1>
        <p className="subtitle">
          UI and AI clients use the same GraphQL endpoint.
        </p>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Task</h2>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={4}
            placeholder="Explain customer C-1027 risk"
          />
          <label>
            Actor role
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value as ActorRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <button onClick={onRun} disabled={loading}>
            {loading ? "Running…" : "Run through Viaduct"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="card">
          <h2>Answer</h2>
          {result ? (
            <pre className="answer">{result.answer}</pre>
          ) : (
            <p className="muted">Run a task to see the answer.</p>
          )}
        </div>

        <div className="card">
          <h2>GraphQL query</h2>
          <pre>{result?.query || "—"}</pre>
          {result && (
            <>
              <h3>Variables</h3>
              <pre>{JSON.stringify(result.variables, null, 2)}</pre>
            </>
          )}
        </div>

        <div className="card">
          <h2>Execution metadata</h2>
          {result ? (
            <>
              <h3>Services touched</h3>
              {result.executionMetadata.servicesTouched.length === 0 ? (
                <p className="muted">none</p>
              ) : (
                <ul>
                  {result.executionMetadata.servicesTouched.map((s) => (
                    <li key={s}><code>{s}</code></li>
                  ))}
                </ul>
              )}

              <h3>Blocked fields</h3>
              {result.executionMetadata.blockedFields.length === 0 ? (
                <p className="muted">none — all requested fields allowed</p>
              ) : (
                <ul>
                  {result.executionMetadata.blockedFields.map((f) => (
                    <li key={f}><code>{f}</code></li>
                  ))}
                </ul>
              )}

              <h3>Policy decisions</h3>
              {result.executionMetadata.policyDecisions.length === 0 ? (
                <p className="muted">none</p>
              ) : (
                <ul className="policy">
                  {result.executionMetadata.policyDecisions.map((p, i) => (
                    <li key={i} className={p.decision === "ALLOW" ? "allow" : "deny"}>
                      <strong>{p.decision}</strong> <code>{p.field}</code> — {p.reason}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="muted">—</p>
          )}
        </div>
      </section>

      <footer>
        The agent only calls <code>/graphql</code>. Internal systems are reached
        through Viaduct tenant resolvers.
      </footer>
    </div>
  );
}
