const GRAPHQL_URL = process.env.GRAPHQL_URL || "http://graphql-gateway:5000/graphql";

export async function runGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: any[] };
  if (body.errors?.length) {
    throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
  }
  return body.data as T;
}
