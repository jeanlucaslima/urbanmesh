const GRAPHQL_URL = process.env.GRAPHQL_URL || "http://viaduct-server:8080/graphql";

export interface GraphQLEnvelope<T> {
  data?: T;
  errors?: unknown[];
  extensions?: Record<string, unknown>;
}

export async function runGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown>
): Promise<GraphQLEnvelope<T>> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`graph returned HTTP ${res.status}`);
  }
  return (await res.json()) as GraphQLEnvelope<T>;
}
