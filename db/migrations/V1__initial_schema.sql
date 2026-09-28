-- Flyway Migration V1: Campus Resource Exchange (CRX) Core Schema
-- Target: PostgreSQL 15+
-- Enforces foreign keys, domain constraints, state-machine enumerations, and search indexes.

CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  allowed_domain VARCHAR(120) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semesters (
  id INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 10),
  label VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  resource_kind VARCHAR(20) NOT NULL CHECK (resource_kind IN ('PHYSICAL', 'DIGITAL', 'BOTH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY,
  course_code VARCHAR(24) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  student_id VARCHAR(40) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  graduation_year INTEGER NOT NULL CHECK (graduation_year BETWEEN 2024 AND 2035),
  role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
  verification_status VARCHAR(24) NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('VERIFIED', 'PENDING', 'SUSPENDED')),
  email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  profile_photo_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_jti VARCHAR(120) NOT NULL UNIQUE,
  csrf_token VARCHAR(120) NOT NULL,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY,
  catalog_code VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL CHECK (char_length(title) >= 3),
  description VARCHAR(2000) NOT NULL CHECK (char_length(description) >= 10),
  resource_type VARCHAR(16) NOT NULL CHECK (resource_type IN ('PHYSICAL', 'DIGITAL')),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  academic_year VARCHAR(16) NOT NULL,
  condition VARCHAR(24) NOT NULL CHECK (condition IN ('NEW', 'GOOD', 'FAIR', 'NOT_APPLICABLE')),
  lending_type VARCHAR(24) NOT NULL CHECK (lending_type IN ('BORROW', 'GIVEAWAY', 'DIGITAL_DOWNLOAD')),
  availability VARCHAR(24) NOT NULL DEFAULT 'AVAILABLE' CHECK (
    availability IN ('AVAILABLE', 'REQUESTED', 'APPROVED', 'BORROWED', 'RETURN_REQUESTED', 'RETURNED', 'UNAVAILABLE')
  ),
  moderation_status VARCHAR(24) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (
    moderation_status IN ('APPROVED', 'PENDING_REVIEW', 'REJECTED', 'FLAGGED')
  ),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pickup_location VARCHAR(160),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_images (
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_files (
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_extension VARCHAR(16) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  sha256_checksum VARCHAR(64) NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS borrow_requests (
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_duration_days INTEGER NOT NULL CHECK (requested_duration_days BETWEEN 1 AND 180),
  required_until DATE NOT NULL,
  message VARCHAR(1000) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED' CHECK (
    status IN ('REQUESTED', 'APPROVED', 'BORROWED', 'RETURN_REQUESTED', 'RETURNED', 'REJECTED', 'CANCELLED', 'OVERDUE')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  borrow_request_id UUID NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(24) NOT NULL CHECK (transaction_type IN ('BORROW', 'GIVEAWAY')),
  handed_over_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  borrower_rating SMALLINT CHECK (borrower_rating BETWEEN 1 AND 5),
  borrower_feedback VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_requests (
  id UUID PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL CHECK (char_length(title) >= 3),
  description VARCHAR(2000) NOT NULL CHECK (char_length(description) >= 10),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  resource_type VARCHAR(16) NOT NULL CHECK (resource_type IN ('PHYSICAL', 'DIGITAL')),
  preference VARCHAR(24) NOT NULL CHECK (preference IN ('BORROW', 'GIVEAWAY', 'DIGITAL_COPY')),
  required_until DATE NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULFILLED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  borrow_request_id UUID REFERENCES borrow_requests(id) ON DELETE CASCADE,
  resource_request_id UUID REFERENCES resource_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body VARCHAR(1000) NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(140) NOT NULL,
  message VARCHAR(500) NOT NULL,
  link_target VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(24) NOT NULL CHECK (target_type IN ('RESOURCE', 'USER', 'MESSAGE', 'REQUEST')),
  target_id UUID NOT NULL,
  reason VARCHAR(40) NOT NULL CHECK (
    reason IN (
      'INAPPROPRIATE_CONTENT',
      'COPYRIGHTED_MATERIAL',
      'SPAM',
      'MISLEADING_INFORMATION',
      'OFFENSIVE_CONTENT',
      'UNSAFE_ITEM',
      'SUSPICIOUS_USER'
    )
  ),
  details VARCHAR(1000) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolution_note VARCHAR(500),
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(120) NOT NULL,
  actor_role VARCHAR(24) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64),
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast partial search & filtering (Sections 17, 18, 32)
CREATE INDEX IF NOT EXISTS idx_resources_search ON resources (title, department_id, semester_id, category_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_availability ON resources (moderation_status, availability, resource_type);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_owner ON borrow_requests (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_requester ON borrow_requests (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
