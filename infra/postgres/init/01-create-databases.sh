#!/bin/bash
set -e

echo "==> Running Ficcado PostgreSQL Database Initialization..."

# Helper to create user and database with grants
init_database_and_user() {
    local db_name="$1"
    local db_user="$2"
    local db_pass="$3"

    echo "==> Initializing role '${db_user}' and database '${db_name}'..."

    # Create role if not exists and update password
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${db_user}') THEN
                CREATE ROLE "${db_user}" WITH LOGIN PASSWORD '${db_pass}';
            ELSE
                ALTER ROLE "${db_user}" WITH PASSWORD '${db_pass}';
            END IF;
        END
        \$\$;
EOSQL

    # Check if database exists; if not, create it with owner
    local db_exists=$(psql -v ON_ERROR_STOP=1 -tA --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT 1 FROM pg_database WHERE datname = '${db_name}';")
    if [ "$db_exists" != "1" ]; then
        echo "Creating database '${db_name}' owned by '${db_user}'..."
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "CREATE DATABASE \"${db_name}\" OWNER \"${db_user}\";"
    fi

    # Ensure grants on database and schema public
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "GRANT ALL PRIVILEGES ON DATABASE \"${db_name}\" TO \"${db_user}\";"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "${db_name}" <<-EOSQL
        GRANT ALL ON SCHEMA public TO "${db_user}";
        ALTER SCHEMA public OWNER TO "${db_user}";
EOSQL
}

# 1. Application Databases
init_database_and_user "${WEBSITE_DB_NAME:-ficcado_website_data}" "${WEBSITE_DB_USER:-ficcado_website_user}" "${WEBSITE_DB_PASSWORD:-website_pass_change_me}"
init_database_and_user "${PAYMENT_DB_NAME:-ficcado_payment_gateway_data}" "${PAYMENT_DB_USER:-ficcado_payment_user}" "${PAYMENT_DB_PASSWORD:-payment_pass_change_me}"

# 2. Test Databases (Dedicated test login with least privilege)
init_database_and_user "${TEST_CRM_DB_NAME:-ficcado_data_test}" "${TEST_DB_USER:-ficcado_test_user}" "${TEST_DB_PASSWORD:-test_pass_change_me}"
init_database_and_user "${TEST_WEBSITE_DB_NAME:-ficcado_website_data_test}" "${TEST_DB_USER:-ficcado_test_user}" "${TEST_DB_PASSWORD:-test_pass_change_me}"
init_database_and_user "${TEST_PAYMENT_DB_NAME:-ficcado_payment_gateway_data_test}" "${TEST_DB_USER:-ficcado_test_user}" "${TEST_DB_PASSWORD:-test_pass_change_me}"

echo "==> Ficcado PostgreSQL Database Initialization Completed Successfully!"
