-- Migration: Add eNSpect workflow tables and role column
-- Run AFTER schema.sql on existing databases

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'investigator';

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address_line VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  country VARCHAR(120),
  zip_code VARCHAR(20),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_type VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_text TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_image TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signed_name VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signature_updated_at TIMESTAMP;

UPDATE users SET role = 'supervisor' WHERE email IN (
  'james.mitchell@fda.hhs.gov',
  'robert.okafor@fda.hhs.gov'
);

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

-- Supervisor workflow archive (hide from active list; restore later)
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS workflow_archived BOOLEAN NOT NULL DEFAULT FALSE;
