package com.aps.ficcado_inventory_sales_management_app.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Validates security-critical configuration properties on application startup (BE-001).
 *
 * Ensures:
 * 1. JWT secret meets minimum length requirements for HS256 (32+ bytes / 256 bits).
 * 2. Insecure default secrets/passwords are strictly forbidden in production environments.
 */
@Slf4j
@Component
public class SecurityPropertiesValidator {

    private static final String INSECURE_DEFAULT_JWT = "ficcado-jwt-secret-key-32-bytes-minimum-length-for-hs256!";
    private static final String INSECURE_DEFAULT_DB_PASS = "arjun7945";

    private final Environment environment;

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    public SecurityPropertiesValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        boolean isProduction = isProductionEnvironment();

        // 1. JWT Secret Validation
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("FATAL: app.jwt.secret must be set and cannot be blank.");
        }

        if (jwtSecret.getBytes().length < 32) {
            throw new IllegalStateException(
                    "FATAL: app.jwt.secret must be at least 32 bytes (256 bits) long for secure HS256 signing. Current length: "
                            + jwtSecret.getBytes().length + " bytes.");
        }

        if (isProduction) {
            if (INSECURE_DEFAULT_JWT.equals(jwtSecret.trim())) {
                throw new IllegalStateException(
                        "FATAL: Production deployment cannot use the default insecure JWT secret. Set JWT_SECRET in environment variables.");
            }
            if (INSECURE_DEFAULT_DB_PASS.equals(dbPassword.trim())) {
                throw new IllegalStateException(
                        "FATAL: Production deployment cannot use the default development database password. Set DB_PASSWORD in environment variables.");
            }
            log.info("Production security configuration validated successfully.");
        } else {
            if (INSECURE_DEFAULT_JWT.equals(jwtSecret.trim())) {
                log.warn("==================================================================================");
                log.warn("SECURITY WARNING: Running with default development JWT secret. Override JWT_SECRET for production.");
                log.warn("==================================================================================");
            }
            if (INSECURE_DEFAULT_DB_PASS.equals(dbPassword.trim())) {
                log.warn("SECURITY WARNING: Running with default local database password. Override DB_PASSWORD for production.");
            }
        }
    }

    private boolean isProductionEnvironment() {
        List<String> activeProfiles = Arrays.asList(environment.getActiveProfiles());
        return activeProfiles.contains("prod") || activeProfiles.contains("production");
    }
}
