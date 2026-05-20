import { useState } from "react";
import { runAgent, ActorRole, RunResponse } from "./api";

const ROLES: ActorRole[] = [
  "AI_ASSISTANT",
  "SUPPORT_AGENT",
  "FINANCE_AGENT",
  "ADMIN",
];

const DEFAULT_TASK =
  "Summarize customer C-1027 and recommend the next support action.";

export default function App() {
  const [task, setTask] = useState(DEFAULT_TASK);
  const [actorRole, setActorRole] = useState<ActorRole>("AI_ASSISTANT");
  const [result, setResult] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await runAgent({ task, actorRole });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Agent-Safe API Access Demo</h1>
        <p className="thesis">
          Agents and applications should not call internal systems directly.
          They should go through a governed, typed, permission-aware API layer.
        </p>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Task</h2>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={4}
          />
          <label>
            Actor role:
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value as ActorRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button onClick={onRun} disabled={loading}>
            {loading ? "Running…" : "Run demo"}
          </button>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="card">
          <h2>Final answer</h2>
          {result ? <p>{result.answer}</p> : <p className="muted">Run the demo to see the answer.</p>}
        </div>

        <div className="card">
          <h2>GraphQL query</h2>
          <pre>{result?.graphqlQuery || "—"}</pre>
          {result && (
            <>
              <h3>Variables</h3>
              <pre>{JSON.stringify(result.graphqlVariables, null, 2)}</pre>
            </>
          )}
        </div>

        <div className="card">
          <h2>Execution metadata</h2>
          {result ? (
            <>
              <h3>Services touched</h3>
              <ul>
                {result.execution.servicesTouched.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3>Blocked fields</h3>
              {result.execution.blockedFields.length === 0 ? (
                <p className="muted">None.</p>
              ) : (
                <ul>
                  {result.execution.blockedFields.map((b) => (
                    <li key={b.path}>
                      <code>{b.path}</code> — {b.reason}
                    </li>
                  ))}
                </ul>
              )}
              <h3>Policy decisions</h3>
              <ul className="policy">
                {result.execution.policyDecisions.map((p, i) => (
                  <li key={i} className={p.allowed ? "allow" : "deny"}>
                    <strong>{p.allowed ? "ALLOW" : "DENY"}</strong>{" "}
                    {p.resource}.{p.field} ({p.action}) — {p.reason}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">—</p>
          )}
        </div>
      </section>
    </div>
  );
}
