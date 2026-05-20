import { useState } from "react";
import { runAgent, ActorRole, AgentRunResponse } from "./api";

const ROLES: ActorRole[] = [
  "PUBLIC_AI_ASSISTANT",
  "CIVIC_OPERATOR",
  "PERMIT_ANALYST",
  "CITY_ADMIN",
];

const ROLE_LABEL: Record<ActorRole, string> = {
  PUBLIC_AI_ASSISTANT: "Public AI Assistant",
  CIVIC_OPERATOR: "Civic Operator",
  PERMIT_ANALYST: "Permit Analyst",
  CITY_ADMIN: "City Admin",
};

const DEFAULT_TASK = "Explain what is happening around 16th & Mission";

interface Preset {
  label: string;
  task: string;
  role: ActorRole;
}

const PRESETS: Preset[] = [
  { label: "Block review",   task: "Explain what is happening around 16th & Mission",            role: "PUBLIC_AI_ASSISTANT" },
  { label: "Planner view",   task: "Explain what is happening around 16th & Mission",            role: "CITY_ADMIN"          },
  { label: "Civic cases",    task: "Summarize civic cases around 16th & Mission",                role: "CIVIC_OPERATOR"      },
  { label: "Permit review",  task: "Review permit activity around 16th & Mission",               role: "PERMIT_ANALYST"      },
  { label: "Ordinary block", task: "Explain what is happening around Inner Sunset residential block", role: "PUBLIC_AI_ASSISTANT" },
];

export default function App() {
  const [task, setTask] = useState(DEFAULT_TASK);
  const [actorRole, setActorRole] = useState<ActorRole>("PUBLIC_AI_ASSISTANT");
  const [result, setResult] = useState<AgentRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await runAgent(task, actorRole);
      if (res.validationError) {
        setResult(null);
        setError(res.validationError.message);
      } else if (res.graphQLErrors) {
        setResult(res);
        setError("GraphQL returned errors. See the query panel.");
      } else {
        setResult(res);
      }
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
    ? actorRole === "CITY_ADMIN"
      ? "This role received the full sensitive context."
      : "This role received a policy-filtered view."
    : null;

  return (
    <div className="app">
      <header>
        <h1>UrbanMesh</h1>
        <p className="subtitle">Turning San Francisco into a GraphQL server.</p>
        <p className="tagline">
          One city question. Many civic domains. One Viaduct graph.
        </p>
      </header>

      <section className="controls card">
        <h2>Task</h2>
        <div className="presets" aria-label="demo presets">
          <span className="presets-label">Presets:</span>
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.label}
              className="preset"
              onClick={() => {
                setTask(p.task);
                setActorRole(p.role);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder="Explain what is happening around 16th & Mission"
        />
        <div className="controls-row">
          <label className="role-label">
            Actor role
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value as ActorRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
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
            location, permits, civic, transit, census, or policy services.
          </p>

          {result?.executionMetadata && (
            <p className="summary">
              <span>
                <strong>{result.executionMetadata.servicesTouched.length}</strong>{" "}
                services
              </span>
              <span>
                <strong>{result.executionMetadata.blockedFields.length}</strong>{" "}
                blocked
              </span>
              <span>
                <strong>{result.executionMetadata.policyDecisions.length}</strong>{" "}
                decisions
              </span>
            </p>
          )}

          <h3>Services coordinated by the graph</h3>
          <p className="hint">What the graph had to call.</p>
          {result?.executionMetadata ? (
            result.executionMetadata.servicesTouched.length === 0 ? (
              <p className="muted">none</p>
            ) : (
              <div className="chips">
                {[...result.executionMetadata.servicesTouched]
                  .sort()
                  .map((s) => (
                    <span className="chip" key={s}>{s}</span>
                  ))}
              </div>
            )
          ) : (
            <p className="muted">—</p>
          )}

          <h3>Blocked fields</h3>
          <p className="hint">What policy removed.</p>
          {result?.executionMetadata ? (
            result.executionMetadata.blockedFields.length === 0 ? (
              <p className="empty-ok">No blocked fields</p>
            ) : (
              <ul className="blocked">
                {[...result.executionMetadata.blockedFields]
                  .sort()
                  .map((f) => (
                    <li key={f}><code>{f}</code></li>
                  ))}
              </ul>
            )
          ) : (
            <p className="muted">—</p>
          )}

          <h3>Policy decisions</h3>
          <p className="hint">Why each sensitive field was allowed or denied.</p>
          {result?.executionMetadata ? (
            result.executionMetadata.policyDecisions.length === 0 ? (
              <p className="muted">none</p>
            ) : (
              <ul className="policy">
                {[...result.executionMetadata.policyDecisions]
                  .sort((a, b) => a.field.localeCompare(b.field))
                  .map((p, i) => (
                    <li
                      key={`${p.field}-${i}`}
                      className={p.decision === "ALLOW" ? "allow" : "deny"}
                    >
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
        <code>/graphql</code>. City services are reached through Viaduct
        tenant resolvers.
      </footer>
    </div>
  );
}
