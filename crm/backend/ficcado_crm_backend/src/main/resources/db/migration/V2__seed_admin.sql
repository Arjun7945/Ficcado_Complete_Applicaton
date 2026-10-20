-- =============================================================================
-- V2: Seed Initial Superadmin
-- =============================================================================
-- Inserts the first Superadmin row from environment variables supplied at
-- deploy time via Flyway placeholders (configured in application.yaml under
-- spring.flyway.placeholders).
--
-- Required environment variables (set before starting the application):
--   SEED_ADMIN_EMAIL         — e.g. admin@ficcado.com
--   SEED_ADMIN_PASSWORD_HASH — bcrypt hash of the initial password (60 chars)
--
-- To generate a bcrypt hash offline:
--   Node: require('bcryptjs').hashSync('yourpassword', 12)
--   Python: import bcrypt; bcrypt.hashpw(b'yourpassword', bcrypt.gensalt(12))
--
-- ON CONFLICT DO NOTHING ensures this is idempotent on repeated startups.
-- =============================================================================

INSERT INTO admins (
    admin_name,
    email_id,
    password_hash,
    role,
    notifications,
    is_active,
    created_at,
    updated_at
)
VALUES (
    'Superadmin',
    '${seed-admin-email}',
    '${seed-admin-password-hash}',
    'SUPERADMIN',
    'ENABLED',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email_id) DO NOTHING;
