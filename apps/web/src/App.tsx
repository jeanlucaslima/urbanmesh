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
      setError(
        e?.message ||
          "The agent service is unavailable. Check docker compose and ./scripts/verify.sh."
      );
    } finally {
      setLoading(false);
    }
  }

  const roleNote = result
    ? actorRole === "ADMIN"
      ? "This role received the full sensitive context."
      : "This role received a policy-filtered view."
    : null;

  return (
    <div className="app">
      <header>
        <h1>Viaduct Agent Demo</h1>
        <p className="subtitle">The agent is just another GraphQL client.</p>
        <p className="tagline">
          One endpoint. Many services. Policy-aware execution.
        </p>
      </header>

      <section className="controls card">
        <h2>Task</h2>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder="Explain customer C-1027 risk"
        />
        <div className="controls-row">
          <label className="role-label">
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
            {loading ? "Running through Viaduct…" : "Run through Viaduct"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="grid-main">
        <div className="card">
          <h2>Answer</h2>
          {result ? (
            <>
              <pre className="answer">{result.answer}</pre>
              {roleNote && <p className="role-note">{roleNote}</p>}
            </>
          ) : (
            <p className="muted">Run a task to see the answer.</p>
          )}
        </div>

        <div className="card evidence">
          <h2>Execution Evidence</h2>
          <p className="proof">
            The agent only calls <code>/graphql</code>. No direct calls to
            customer, billing, support, usage, or policy services.
          </p>

          <h3>Services coordinated by the graph</h3>
          <p className="hint">What the graph had to call.</p>
          {result ? (
            result.executionMetadata.servicesTouched.length === 0 ? (
              <p className="muted">none</p>
            ) : (
              <div className="chips">
                {result.executionMetadata.servicesTouched.map((s) => (
                  <span className="chip" key={s}>{s}</span>
                ))}
              </div>
            )
          ) : (
            <p className="muted">—</p>
          )}

          <h3>Blocked fields</h3>
          <p className="hint">What policy removed.</p>
          {result ? (
            result.executionMetadata.blockedFields.length === 0 ? (
              <p className="empty-ok">No blocked fields</p>
            ) : (
              <ul className="blocked">
                {result.executionMetadata.blockedFields.map((f) => (
                  <li key={f}><code>{f}</code></li>
                ))}
              </ul>
            )
          ) : (
            <p className="muted">—</p>
          )}

          <h3>Policy decisions</h3>
          <p className="hint">Why each sensitive field was allowed or denied.</p>
          {result ? (
            result.executionMetadata.policyDecisions.length === 0 ? (
              <p className="muted">none</p>
            ) : (
              <ul className="policy">
                {result.executionMetadata.policyDecisions.map((p, i) => (
                  <li key={i} className={p.decision === "ALLOW" ? "allow" : "deny"}>
                    <span className="badge">
                      {p.decision === "ALLOW" ? "✓ ALLOW" : "✗ DENY"}
                    </span>
                    <code>{p.field}</code>
                    <span className="reason">{p.reason}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="muted">—</p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Generated GraphQL query</h2>
        <p className="hint">The agent sends this to Viaduct <code>/graphql</code>.</p>
        <pre className="gql">{result?.query || "—"}</pre>
        {result && (
          <>
            <h3>Variables</h3>
            <pre>{JSON.stringify(result.variables, null, 2)}</pre>
          </>
        )}
      </section>

      <footer>
        <strong>Architecture proof:</strong> the agent only calls{" "}
        <code>/graphql</code>. Internal services are reached through Viaduct
        tenant resolvers.
      </footer>
    </div>
  );
}
