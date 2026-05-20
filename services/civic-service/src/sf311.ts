import type { Pool } from "pg";

const SF311_DATASET = "vw6y-z8j6";
const SF311_ENDPOINT = `https://data.sfgov.org/resource/${SF311_DATASET}.json`;
const TIMEOUT_MS = 3000;

export type Sf311Mode = "auto" | "live" | "fixture";

export interface CivicCase {
  caseId: string | null;
  category: string | null;
  type: string | null;
  status: string | null;
  openedAt: string | null;
  address: string | null;
}

export interface CivicSummary {
  blockId: string;
  source: "sf-311-live" | "fixture-fallback";
  openCases: number;
  latestIssue: string | null;
  escalationStatus: "ESCALATED" | "MONITORING" | "NORMAL" | "NONE";
  recentCases: CivicCase[];
}

// Per-block hints for the live SF 311 query. Only SF-1027 (16th & Mission)
// uses the live API in this PRD; other blocks fall back to fixtures.
const LIVE_QUERY: Record<string, { q: string }> = {
  "SF-1027": { q: "Mission" },
};

function mode(): Sf311Mode {
  const m = (process.env.SF311_MODE || "auto").toLowerCase();
  if (m === "live" || m === "fixture" || m === "auto") return m;
  return "auto";
}

function escalation(highSev: boolean, medSev: boolean, hasOpen: boolean) {
  if (highSev) return "ESCALATED" as const;
  if (medSev) return "MONITORING" as const;
  if (hasOpen) return "NORMAL" as const;
  return "NONE" as const;
}

async function fetchLive(blockId: string): Promise<CivicSummary | null> {
  const hint = LIVE_QUERY[blockId];
  if (!hint) return null;

  const url = new URL(SF311_ENDPOINT);
  url.searchParams.set("$limit", "20");
  url.searchParams.set("$order", "requested_datetime DESC");
  url.searchParams.set("$q", hint.q);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(body) || body.length === 0) return null;

    const recentCases: CivicCase[] = body.slice(0, 10).map((r) => ({
      caseId: (r.service_request_id as string | undefined) ?? null,
      category: (r.service_name as string | undefined) ?? null,
      type:
        (r.service_subtype as string | undefined) ??
        (r.service_details as string | undefined) ??
        null,
      status: (r.status_description as string | undefined) ?? null,
      openedAt: (r.requested_datetime as string | undefined) ?? null,
      address: (r.address as string | undefined) ?? null,
    }));

    const openCases = recentCases.filter(
      (c) => (c.status ?? "").toLowerCase() === "open"
    ).length;
    const latestIssue =
      recentCases.find((c) => c.type)?.type ??
      recentCases.find((c) => c.category)?.category ??
      null;

    // Live cases don't carry our internal severity. Derive a coarse signal:
    // any open case = MONITORING, multiple open cases = ESCALATED.
    const highSev = openCases >= 3;
    const medSev = openCases >= 1;

    return {
      blockId,
      source: "sf-311-live",
      openCases: openCases || recentCases.length,
      latestIssue,
      escalationStatus: escalation(highSev, medSev, recentCases.length > 0),
      recentCases,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFixture(
  blockId: string,
  pool: Pool
): Promise<CivicSummary> {
  const { rows } = await pool.query(
    `SELECT id, title, severity, status, summary,
            created_at AS "createdAt"
       FROM civic_cases WHERE block_id = $1
       ORDER BY CASE severity
                  WHEN 'high' THEN 1
                  WHEN 'medium' THEN 2
                  WHEN 'low' THEN 3
                  ELSE 4
                END`,
    [blockId]
  );
  const open = rows.filter((r) => r.status === "open");
  const highSev = open.some((r) => r.severity === "high");
  const medSev = open.some((r) => r.severity === "medium");
  const latest = open[0] ?? rows[0];
  return {
    blockId,
    source: "fixture-fallback",
    openCases: open.length,
    latestIssue: latest?.title ?? null,
    escalationStatus: escalation(highSev, medSev, open.length > 0),
    recentCases: [],
  };
}

export async function fetchCivicSummary(
  blockId: string,
  pool: Pool
): Promise<CivicSummary> {
  const m = mode();
  if (m === "fixture") return fetchFixture(blockId, pool);
  if (m === "live") {
    const live = await fetchLive(blockId);
    if (live) return live;
    // In strict live mode, do not fall back silently; surface the lack of
    // live data so operators notice. Still return a valid shape.
    return {
      blockId,
      source: "fixture-fallback",
      openCases: 0,
      latestIssue: null,
      escalationStatus: "NONE",
      recentCases: [],
    };
  }
  // auto
  const live = await fetchLive(blockId);
  if (live) return live;
  return fetchFixture(blockId, pool);
}
