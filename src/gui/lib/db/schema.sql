-- Run this in psql: psql -U <your_user> -d <your_db> -f src/gui/lib/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (signup + login)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30),
  fda_position VARCHAR(150),
  role VARCHAR(20) NOT NULL DEFAULT 'investigator',
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_code VARCHAR(10),
  verification_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address_line VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  country VARCHAR(120),
  zip_code VARCHAR(20),
  signature_type VARCHAR(20),
  signature_text TEXT,
  signature_image TEXT,
  signed_name VARCHAR(255),
  signature_updated_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inspections (eNSpect workflow)
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  firm_name VARCHAR(255) NOT NULL DEFAULT '',
  fei_number VARCHAR(20) NOT NULL DEFAULT '',
  establishment_type VARCHAR(100) DEFAULT '',
  street_address VARCHAR(255) DEFAULT '',
  city VARCHAR(120) DEFAULT '',
  state VARCHAR(120) DEFAULT '',
  zip_code VARCHAR(20) DEFAULT '',
  country VARCHAR(120) DEFAULT 'United States',
  district_office VARCHAR(255) DEFAULT '',
  inspection_start DATE,
  inspection_end DATE,
  regulatory_basis TEXT DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'created',
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  observations_json TEXT DEFAULT '[]',
  eir_json TEXT DEFAULT '{}',
  metadata_json TEXT DEFAULT '{}',
  raw_notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow audit log (immutable)
CREATE TABLE IF NOT EXISTS inspection_workflow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  comments TEXT DEFAULT '',
  previous_status VARCHAR(30),
  new_status VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Supervisor reviews
CREATE TABLE IF NOT EXISTS inspection_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  decision VARCHAR(20) NOT NULL,
  comments TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  author_role VARCHAR(20) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES inspections(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  file_docx_path TEXT DEFAULT '',
  file_pdf_path TEXT DEFAULT '',
  version_type VARCHAR(20) NOT NULL,
  comments_snapshot TEXT DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_library_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  final_docx_path TEXT DEFAULT '',
  final_pdf_path TEXT DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'ready_to_publish',
  approved_at TIMESTAMP DEFAULT NOW(),
  investigator_id UUID REFERENCES users(id),
  supervisor_id UUID REFERENCES users(id),
  publish_ready BOOLEAN NOT NULL DEFAULT TRUE,
  archived_year INTEGER,
  reopened_from_document_id UUID REFERENCES document_library_records(id),
  final_metadata_json TEXT NOT NULL DEFAULT '{}',
  final_observations_json TEXT NOT NULL DEFAULT '[]',
  final_eir_json TEXT NOT NULL DEFAULT '{}',
  signatures_json TEXT NOT NULL DEFAULT '{}',
  comments_snapshot_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed 5 FDA inspector records (pre-verified staff accounts)
-- Password for all seed accounts: FDAInspector2026!
-- James Mitchell and Robert Okafor are supervisors; rest are investigators
INSERT INTO users (first_name, last_name, email, phone, fda_position, role, password_hash, is_verified)
VALUES
  (
    'James', 'Mitchell',
    'james.mitchell@fda.hhs.gov',
    '+1 (301) 796-1001',
    'Senior Investigator — Office of Regulatory Affairs',
    'supervisor',
    '$2b$12$L3m9LDrlozdqHk03tzBVyuklSJlp.dbpQQd5lsD.BRI7j.Con5Zna',
    TRUE
  ),
  (
    'Sandra', 'Chen',
    'sandra.chen@fda.hhs.gov',
    '+1 (301) 796-1002',
    'Compliance Officer — Center for Drug Evaluation and Research',
    'investigator',
    '$2b$12$L3m9LDrlozdqHk03tzBVyuklSJlp.dbpQQd5lsD.BRI7j.Con5Zna',
    TRUE
  ),
  (
    'Robert', 'Okafor',
    'robert.okafor@fda.hhs.gov',
    '+1 (301) 796-1003',
    'Division Director — Office of Pharmaceutical Quality Operations',
    'supervisor',
    '$2b$12$L3m9LDrlozdqHk03tzBVyuklSJlp.dbpQQd5lsD.BRI7j.Con5Zna',
    TRUE
  ),
  (
    'Maria', 'Delgado',
    'maria.delgado@fda.hhs.gov',
    '+1 (301) 796-1004',
    'Investigator — Center for Biologics Evaluation and Research',
    'investigator',
    '$2b$12$L3m9LDrlozdqHk03tzBVyuklSJlp.dbpQQd5lsD.BRI7j.Con5Zna',
    TRUE
  ),
  (
    'David', 'Park',
    'david.park@fda.hhs.gov',
    '+1 (301) 796-1005',
    'Program Manager — Office of Criminal Investigations',
    'investigator',
    '$2b$12$L3m9LDrlozdqHk03tzBVyuklSJlp.dbpQQd5lsD.BRI7j.Con5Zna',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

