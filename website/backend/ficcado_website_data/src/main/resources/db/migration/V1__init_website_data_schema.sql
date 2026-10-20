-- =============================================================================
-- Ficcado Website Data — V1 Schema Migration
-- Tables: customer_enquiries, customer_complaints, support_emails, drop_notifications, otp_records
-- =============================================================================

-- 1. Customer Enquiries
CREATE TABLE IF NOT EXISTS customer_enquiries (
    id BIGSERIAL PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    order_id VARCHAR(64),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_ticket_id ON customer_enquiries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON customer_enquiries(email);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON customer_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON customer_enquiries(created_at);

-- 2. Customer Complaints
CREATE TABLE IF NOT EXISTS customer_complaints (
    id BIGSERIAL PRIMARY KEY,
    complaint_id VARCHAR(64) NOT NULL UNIQUE,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    order_id VARCHAR(64),
    complaint_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_complaint_id ON customer_complaints(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_email ON customer_complaints(customer_email);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON customer_complaints(status);

-- 3. Support Emails
CREATE TABLE IF NOT EXISTS support_emails (
    id BIGSERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    email_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_emails_recipient ON support_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_support_emails_type ON support_emails(email_type);
CREATE INDEX IF NOT EXISTS idx_support_emails_status ON support_emails(status);

-- 4. Drop & Restock Notifications
CREATE TABLE IF NOT EXISTS drop_notifications (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    capsule_name VARCHAR(100),
    interest_category VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_email ON drop_notifications(email);
CREATE INDEX IF NOT EXISTS idx_notifications_capsule ON drop_notifications(capsule_name);

-- 5. OTP Records
CREATE TABLE IF NOT EXISTS otp_records (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_records(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_records(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON otp_records(created_at);
