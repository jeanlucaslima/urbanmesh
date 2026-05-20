CREATE TABLE city_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  planning_status TEXT NOT NULL,
  planning_risk TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE zoning (
  block_id TEXT PRIMARY KEY REFERENCES city_blocks(id),
  district TEXT NOT NULL,
  allowed_uses TEXT NOT NULL,
  height_limit TEXT NOT NULL,
  special_use_district TEXT
);

CREATE TABLE permits (
  block_id TEXT PRIMARY KEY REFERENCES city_blocks(id),
  active_permits INT NOT NULL,
  recent_permits INT NOT NULL,
  estimated_project_value NUMERIC NOT NULL,
  compliance_risk TEXT NOT NULL
);

CREATE TABLE civic_cases (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES city_blocks(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transit_summaries (
  block_id TEXT PRIMARY KEY REFERENCES city_blocks(id),
  nearby_stops INT NOT NULL,
  access_score INT NOT NULL,
  ridership_trend TEXT NOT NULL,
  last_observed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE census_profiles (
  block_id TEXT PRIMARY KEY REFERENCES city_blocks(id),
  population INT NOT NULL,
  median_income INT NOT NULL,
  housing_density TEXT NOT NULL
);

INSERT INTO city_blocks VALUES
  ('SF-1001', 'Inner Sunset residential block',  'Inner Sunset',  'Stable',            'LOW',        now()),
  ('SF-1027', '16th & Mission',                  'Mission District','Elevated review', 'HIGH',       now()),
  ('SF-2044', 'Civic Center sensitive corridor', 'Civic Center',  'Restricted review', 'RESTRICTED', now());

INSERT INTO zoning VALUES
  ('SF-1001', 'RH-2',  'low-density residential',                              '40-X', NULL),
  ('SF-1027', 'NCT-3', 'mixed-use residential, neighborhood commercial',       '55-X', 'Mission Street Neighborhood Commercial Transit'),
  ('SF-2044', 'P',     'public use, civic',                                    '65-X', 'Civic Center Special Use District');

INSERT INTO permits VALUES
  ('SF-1001', 1,  4,    750000.00,    'LOW'),
  ('SF-1027', 7,  18,   48250000.00,  'HIGH'),
  ('SF-2044', 2,  6,    12500000.00,  'MEDIUM');

INSERT INTO civic_cases VALUES
  ('CC-9001', 'SF-1001', 'Streetlight outage',                       'low',    'open',     'Single streetlight reported out.',                          now(), now()),
  ('CC-9101', 'SF-1027', 'Sidewalk obstruction near transit entrance','high',  'open',     'Recurring sidewalk obstruction blocking BART entrance.',    now(), now()),
  ('CC-9102', 'SF-1027', 'Illegal dumping on Mission St',            'medium', 'open',     'Multiple reports over past two weeks.',                     now(), now()),
  ('CC-9103', 'SF-1027', 'Noise complaint cluster',                  'medium', 'open',     'Recurring late-night noise complaints.',                    now(), now()),
  ('CC-9104', 'SF-1027', 'Graffiti on transit shelter',              'low',    'open',     'Graffiti reported on shelter at 16th & Mission.',           now(), now()),
  ('CC-9201', 'SF-2044', 'Sensitive corridor incident review',       'medium', 'open',     'Compliance review in progress.',                             now(), now()),
  ('CC-9202', 'SF-2044', 'Audit log retention question',             'medium', 'open',     'Compliance team requesting clarity.',                        now(), now());

INSERT INTO transit_summaries VALUES
  ('SF-1001', 2, 58,  'flat',       now() - interval '1 day'),
  ('SF-1027', 9, 94,  'increasing', now() - interval '6 hours'),
  ('SF-2044', 6, 81,  'flat',       now() - interval '2 days');

INSERT INTO census_profiles VALUES
  ('SF-1001',  6420,  142500, 'medium'),
  ('SF-1027', 12840,   96800, 'high'),
  ('SF-2044',  4310,  118400, 'medium');
