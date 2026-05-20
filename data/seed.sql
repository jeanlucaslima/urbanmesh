CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  plan TEXT NOT NULL,
  account_owner TEXT NOT NULL,
  health_score INT NOT NULL,
  status TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE billing (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id),
  billing_status TEXT NOT NULL,
  unpaid_invoice_count INT NOT NULL,
  unpaid_amount NUMERIC,
  payment_method_last4 TEXT,
  internal_finance_notes TEXT,
  risk_score INT
);

CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_summaries (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id),
  active_users INT NOT NULL,
  api_calls_last_30_days INT NOT NULL,
  usage_trend TEXT NOT NULL,
  last_login_at TIMESTAMPTZ NOT NULL,
  feature_adoption_score INT NOT NULL
);

INSERT INTO customers VALUES
  ('C-1001', 'Northstar Labs',   'Software', 'Enterprise', 'Priya Shah',    88, 'HEALTHY',    'LOW',    now()),
  ('C-1027', 'AcmeCloud',        'SaaS',     'Enterprise', 'Diego Alvarez', 52, 'RISKY',      'HIGH',   now()),
  ('C-2044', 'Meridian Finance', 'Finance',  'Business',   'Yuki Tanaka',   61, 'RESTRICTED', 'MEDIUM', now());

INSERT INTO billing VALUES
  ('C-1001', 'current', 0, 0,        '4242', 'Strategic account, paid annually.',                    12),
  ('C-1027', 'overdue', 3, 48250.00, '1881', 'Two invoices >60 days. Renewal at risk; CSM notified.',78),
  ('C-2044', 'current', 0, 0,        '9911', 'Regulated entity. Finance hold for SOC2 audit Q3.',    34);

INSERT INTO support_tickets VALUES
  ('T-9001', 'C-1001', 'Minor UI glitch on dashboard',          'low',    'open',     'Cosmetic issue, low priority.',          now(), now()),
  ('T-9101', 'C-1027', 'API 5xx errors during peak hours',      'high',   'open',     'Recurring outages tied to webhook fanout. Escalated twice.', now(), now()),
  ('T-9102', 'C-1027', 'Billing portal not loading invoices',   'medium', 'open',     'Finance team blocked from reconciling.', now(), now()),
  ('T-9103', 'C-1027', 'Slow query in analytics export',        'medium', 'open',     'Reported 5x in last 2 weeks.',           now(), now()),
  ('T-9201', 'C-2044', 'SSO certificate rotation needed',       'medium', 'open',     'Cert expires in 14 days.',               now(), now()),
  ('T-9202', 'C-2044', 'Audit log retention question',          'medium', 'open',     'Compliance team requesting clarity.',    now(), now());

INSERT INTO usage_summaries VALUES
  ('C-1001', 124, 982000,  'growing',   now() - interval '1 day',  91),
  ('C-1027',  38, 210000,  'declining', now() - interval '6 days', 41),
  ('C-2044',  62, 415000,  'flat',      now() - interval '2 days', 68);
