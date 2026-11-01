-- Postgres schema for Supabase. Run with `npm run db:init`, or paste into the Supabase SQL editor.
-- Enums are TEXT + CHECK so values can be passed as plain parameters.

CREATE TABLE IF NOT EXISTS users (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  -- Public handle, stored lowercase. Used for the future portfolio page (/u/<username>).
  username VARCHAR(30) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','poster')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9_]{3,30}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (lower(username));

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course VARCHAR(150) NOT NULL DEFAULT '',
  semester VARCHAR(50) NOT NULL DEFAULT '',
  bio TEXT,
  skills VARCHAR(500) NOT NULL DEFAULT '',
  branch VARCHAR(100) NOT NULL DEFAULT '',
  grad_year SMALLINT NULL,
  cgpa DECIMAL(4,2) NULL,
  phone VARCHAR(30) NOT NULL DEFAULT '',
  github VARCHAR(200) NOT NULL DEFAULT '',
  linkedin VARCHAR(200) NOT NULL DEFAULT '',
  portfolio VARCHAR(200) NOT NULL DEFAULT '',
  google_scholar VARCHAR(200) NOT NULL DEFAULT '',
  orcid VARCHAR(200) NOT NULL DEFAULT '',
  codeforces VARCHAR(200) NOT NULL DEFAULT '',
  leetcode VARCHAR(200) NOT NULL DEFAULT '',
  preferred_locations VARCHAR(300) NOT NULL DEFAULT ''
);
-- Databases created before these links existed.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_scholar VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS orcid VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS codeforces VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leetcode VARCHAR(200) NOT NULL DEFAULT '';

-- One-time password reset links. Only a hash of the token is stored.
CREATE TABLE IF NOT EXISTS password_resets (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_reset_hash ON password_resets (token_hash);

-- Resume and cover-letter files live in the Supabase Storage bucket; this row holds the metadata.
CREATE TABLE IF NOT EXISTS resumes (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  storage_path VARCHAR(300) NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  -- Cover letters are stored here too, just with a different kind.
  kind TEXT NOT NULL DEFAULT 'resume' CHECK (kind IN ('resume','cover_letter')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internships (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company VARCHAR(100) NOT NULL,
  role VARCHAR(150) NOT NULL,
  location VARCHAR(100) NOT NULL,
  lat DOUBLE PRECISION NULL,
  lon DOUBLE PRECISION NULL,
  -- Filled by `npm run scrape`; seed rows have source = 'seed'.
  source VARCHAR(30) NOT NULL DEFAULT 'seed',
  external_id VARCHAR(190) NULL,
  url VARCHAR(500) NULL,
  description TEXT NULL,
  posted_at TIMESTAMPTZ NULL,
  scraped_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  posted_by INT NULL,
  work_mode TEXT NOT NULL DEFAULT 'onsite' CHECK (work_mode IN ('onsite','remote','hybrid')),
  -- Monthly stipend range in INR. 0/0 means unpaid, NULL means not listed.
  stipend_min INT NULL,
  stipend_max INT NULL,
  duration_months SMALLINT NULL,
  deadline DATE NULL,
  -- Eligibility; NULL means open to everyone. branches is a comma-separated list.
  min_cgpa DECIMAL(4,2) NULL,
  batch_year SMALLINT NULL,
  branches VARCHAR(255) NULL,
  CONSTRAINT uq_source_ext UNIQUE (source, external_id)
);

-- One row per tracked application. internship_id is NULL for cards the user
-- added manually on the Tracker page.
CREATE TABLE IF NOT EXISTS applications (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  internship_id INT NULL REFERENCES internships(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied','OA','Interview','Offer','Rejected')),
  -- The resume version sent with this application (NULL if none or later deleted).
  resume_id INT NULL REFERENCES resumes(id) ON DELETE SET NULL,
  resume_file_name VARCHAR(255) NULL,
  -- Cover letter text written for this application.
  cover_letter TEXT NULL,
  -- An uploaded cover letter file (a resumes row with kind = 'cover_letter').
  cover_letter_id INT NULL REFERENCES resumes(id) ON DELETE SET NULL,
  -- For cards without a linked posting (hand-added or imported); linked cards use the posting's deadline.
  deadline DATE NULL,
  -- "Remind me on": shows up under Coming up on the Tracker.
  remind_on DATE NULL,
  -- Posting link for cards without a linked listing (hand-added or imported).
  link VARCHAR(500) NULL,
  -- Company and role for cards without a linked listing (imported); linked cards use the listing's.
  company VARCHAR(100) NULL,
  role VARCHAR(150) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_internship UNIQUE (user_id, internship_id)
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS link VARCHAR(500) NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company VARCHAR(100) NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS role VARCHAR(150) NULL;

-- Every move between stages, so analytics can measure how long replies take.
CREATE TABLE IF NOT EXISTS application_events (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Applied','OA','Interview','Offer','Rejected')),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_app ON application_events (application_id);

-- ---------- Interview prep ----------
CREATE TABLE IF NOT EXISTS prep_companies (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_prep_company UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS prep_items (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id INT NOT NULL REFERENCES prep_companies(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text VARCHAR(300) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links to DSA problems, notes or anything else useful for one company.
CREATE TABLE IF NOT EXISTS prep_links (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id INT NOT NULL REFERENCES prep_companies(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  url VARCHAR(500) NOT NULL,
  kind TEXT NOT NULL DEFAULT 'notes' CHECK (kind IN ('dsa','notes','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_rounds (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id INT NOT NULL REFERENCES prep_companies(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_type VARCHAR(40) NOT NULL DEFAULT 'Technical',
  held_on DATE NULL,
  reflection TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A question may belong to a round, or just sit in the company's question bank.
-- box / next_review drive the quiz (a Leitner box: right answers are asked less often).
CREATE TABLE IF NOT EXISTS interview_questions (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id INT NOT NULL REFERENCES prep_companies(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id INT NULL REFERENCES interview_rounds(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NULL,
  box SMALLINT NOT NULL DEFAULT 1,
  next_review DATE NOT NULL,
  last_reviewed DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The Express API connects directly; nobody should reach these tables through Supabase's public REST API.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

INSERT INTO internships (company, role, location, lat, lon)
SELECT * FROM (VALUES
  ('Google', 'Frontend Intern', 'Bengaluru', 12.9716, 77.5946),
  ('Microsoft', 'Software Engineering Intern', 'Hyderabad', 17.385, 78.4867),
  ('Amazon', 'SDE Intern', 'Bangalore', 12.9716, 77.5946),
  ('Adobe', 'React Developer Intern', 'Noida', 28.5355, 77.391),
  ('Infosys', 'Web Development Intern', 'Pune', 18.5204, 73.8567)
) AS seed(company, role, location, lat, lon)
WHERE NOT EXISTS (SELECT 1 FROM internships);
