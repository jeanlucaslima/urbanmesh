const CUSTOMER = process.env.CUSTOMER_SERVICE_URL || "http://customer-service:5101";
const BILLING = process.env.BILLING_SERVICE_URL || "http://billing-service:5102";
const SUPPORT = process.env.SUPPORT_SERVICE_URL || "http://support-service:5103";
const USAGE = process.env.USAGE_SERVICE_URL || "http://usage-service:5104";
const POLICY = process.env.POLICY_SERVICE_URL || "http://policy-service:5105";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export const customerClient = {
  get: (id: string) => getJson<any>(`${CUSTOMER}/customers/${encodeURIComponent(id)}`),
};
export const billingClient = {
  get: (customerId: string) =>
    getJson<any>(`${BILLING}/billing/${encodeURIComponent(customerId)}`),
};
export const supportClient = {
  list: (customerId: string) =>
    getJson<any[]>(
      `${SUPPORT}/support/customers/${encodeURIComponent(customerId)}/tickets`
    ),
};
export const usageClient = {
  get: (customerId: string) =>
    getJson<any>(`${USAGE}/usage/customers/${encodeURIComponent(customerId)}`),
};

export interface PolicyDecision {
  resource: string;
  field: string;
  action: string;
  allowed: boolean;
  reason: string;
}

export const policyClient = {
  async check(actorRole: string, resource: string, field: string, action: string): Promise<PolicyDecision> {
    const res = await fetch(`${POLICY}/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorRole, resource, field, action }),
    });
    if (!res.ok) throw new Error(`policy ${res.status}`);
    const data = (await res.json()) as { allowed: boolean; reason: string };
    return { resource, field, action, allowed: data.allowed, reason: data.reason };
  },
};
