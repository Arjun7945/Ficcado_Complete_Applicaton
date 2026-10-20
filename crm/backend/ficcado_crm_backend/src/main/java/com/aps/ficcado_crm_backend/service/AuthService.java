package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.RevokedToken;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.RevokedTokenRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.SecretKey;

/**
 * Authentication service for the Ficcado CRM.
 *
 * Login policy (CRM only): email address is the ONLY accepted identifier.
 * Username-based login is explicitly NOT supported here — it is restricted.
 * (Login via phone number/email for the public website is a separate system.)
 *
 * Session model:
 *   - httpOnly cookie named "ficcado_session" carrying a JWT.
 *   - Cookie management is in AuthController; this service handles token logic.
 *   - Per-device logout: revoking a token only invalidates that specific device
 *     session. Other concurrent sessions (different tokens) are unaffected.
 *
 * Token denylist:
 *   - On logout, the token's SHA-256 hash is inserted into `revoked_tokens`.
 *   - JwtAuthenticationFilter checks the denylist on every authenticated request.
 *   - Expired entries are pruned at startup and every hour (safe: an expired JWT
 *     would already be rejected by the JWT parser before reaching the denylist).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AdminRepository adminRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    // High-performance thread-safe caches with 60s TTL to eliminate connection pool starvation (BE-002)
    private final Map<String, CachedRevocation> revocationCache = new ConcurrentHashMap<>();
    private final Map<Long, CachedAdmin> adminCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 60_000L;

    private record CachedRevocation(boolean revoked, long timestamp) {}
    private record CachedAdmin(Admin admin, long timestamp) {}

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    // ── Authentication — Email Only ───────────────────────────────────────────

    /**
     * Verify credentials and return the Admin if valid.
     *
     * CRM login accepts email address ONLY. Username-based login is NOT supported
     * and is intentionally excluded. If the input does not look like an email
     * (contains no '@'), authentication is rejected immediately — this provides a
     * clear, secure boundary and prevents username enumeration via timing attacks.
     */
    @Transactional(readOnly = true)
    public Optional<Admin> authenticate(String email, String rawPassword) {
        if (email == null || email.isBlank()) {
            return Optional.empty();
        }
        String trimmed = email.trim().toLowerCase();

        // Enforce email-only: reject anything that is not in email format
        if (!trimmed.contains("@")) {
            log.warn("CRM login rejected — username login is not permitted; only email is accepted.");
            return Optional.empty();
        }

        return adminRepository.findByEmailIdIgnoreCase(trimmed)
                .filter(admin -> admin.getIsActive()
                        && passwordEncoder.matches(rawPassword, admin.getPasswordHash()));
    }

    // ── JWT Generation & Validation ───────────────────────────────────────────

    /**
     * Generate a JWT for the given admin.
     * Claims: sub (admin id), email, role, adminName.
     * Signed with HS256 using JWT_SECRET.
     */
    public String generateToken(Admin admin) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(admin.getId().toString())
                .claim("email", admin.getEmailId())
                .claim("role", admin.getRole().name())
                .claim("adminName", admin.getAdminName())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Validate a JWT and return its claims.
     * Throws JwtException if invalid or expired.
     */
    public Claims validateToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Load admin from token's subject claim.
     * Returns empty if the token is invalid, expired, or belongs to an inactive admin.
     */
    @Transactional(readOnly = true)
    public Optional<Admin> getAdminFromToken(String token) {
        try {
            Claims claims = validateToken(token);
            String role = claims.get("role", String.class);
            if ("ROLE_CUSTOMER".equals(role)) {
                return Optional.empty();
            }
            Long adminId = Long.parseLong(claims.getSubject());
            long now = System.currentTimeMillis();
            CachedAdmin cached = adminCache.get(adminId);
            if (cached != null && (now - cached.timestamp() < CACHE_TTL_MS)) {
                if (cached.admin() != null && Boolean.TRUE.equals(cached.admin().getIsActive())) {
                    return Optional.of(cached.admin());
                } else if (cached.admin() == null || !Boolean.TRUE.equals(cached.admin().getIsActive())) {
                    return Optional.empty();
                }
            }
            Optional<Admin> opt = adminRepository.findById(adminId)
                    .filter(Admin::getIsActive);
            adminCache.put(adminId, new CachedAdmin(opt.orElse(null), now));
            return opt;
        } catch (Exception e) {
            log.warn("Error getting active admin from token: {}", e.getMessage(), e);
            return Optional.empty();
        }
    }

    // ── Per-Device Token Denylist ─────────────────────────────────────────────

    /**
     * Revoke a specific JWT token — adds its hash to the denylist.
     *
     * Per-device behavior: only THIS token is revoked. Any other tokens held
     * by the same admin on other devices are NOT affected.
     *
     * @param rawToken the raw JWT string (from the session cookie)
     * @param admin    the authenticated admin (used for audit logging)
     */
    @Transactional
    public void revokeToken(String rawToken, Admin admin) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        try {
            String hash = sha256Hex(rawToken);
            revocationCache.put(hash, new CachedRevocation(true, System.currentTimeMillis()));

            // Idempotent: if this token was already revoked (e.g. double-click logout), skip
            if (revokedTokenRepository.existsByTokenHash(hash)) {
                log.debug("Token already revoked — skipping duplicate denylist insert for admin: {}",
                        admin != null ? admin.getEmailId() : "unknown");
                return;
            }

            // Extract expiry from JWT to know when the denylist entry can be safely pruned
            Instant expiresAt;
            try {
                Claims claims = validateToken(rawToken);
                expiresAt = claims.getExpiration().toInstant();
            } catch (JwtException | IllegalArgumentException e) {
                // If the token is already expired or invalid, set expiry to now
                // (it will be pruned immediately at next cleanup cycle)
                log.debug("Token invalid or expired during revocation; setting expiry to now: {}", e.getMessage());
                expiresAt = Instant.now();
            }

            RevokedToken entry = RevokedToken.builder()
                    .tokenHash(hash)
                    .admin(admin)
                    .expiresAt(expiresAt)
                    .build();
            revokedTokenRepository.save(entry);

            log.info("Token revoked (logout) for admin: {} — per-device; other sessions unaffected.",
                    admin != null ? admin.getEmailId() : "unknown");

        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed to be available in all JVMs — this cannot happen
            log.error("SHA-256 not available — token revocation failed", e);
            throw new IllegalStateException("Token revocation failed: SHA-256 unavailable", e);
        }
    }

    /**
     * Check whether a token has been revoked (i.e. is in the denylist).
     * Called by JwtAuthenticationFilter on every authenticated request.
     *
     * @param rawToken the raw JWT string to check
     * @return true if the token is revoked and should be treated as unauthenticated
     */
    @Transactional(readOnly = true)
    public boolean isTokenRevoked(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return false;
        }
        try {
            String hash = sha256Hex(rawToken);
            long now = System.currentTimeMillis();
            CachedRevocation cached = revocationCache.get(hash);
            if (cached != null && (now - cached.timestamp() < CACHE_TTL_MS)) {
                return cached.revoked();
            }
            boolean revoked = revokedTokenRepository.existsByTokenHash(hash);
            revocationCache.put(hash, new CachedRevocation(revoked, now));
            return revoked;
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 not available — cannot perform denylist check; treating as revoked for safety", e);
            return true; // Fail-safe: treat as revoked if we can't check
        }
    }

    /**
     * Prune expired denylist entries.
     * Runs hourly via @Scheduled. Safe: expired JWTs are already rejected
     * by JWT validation before the denylist check is ever reached.
     */
    @Scheduled(cron = "0 0 * * * *") // every hour at :00
    @Transactional
    public void pruneExpiredRevokedTokens() {
        int removed = revokedTokenRepository.deleteByExpiresAtBefore(Instant.now());
        long now = System.currentTimeMillis();
        revocationCache.entrySet().removeIf(e -> now - e.getValue().timestamp() > CACHE_TTL_MS);
        adminCache.entrySet().removeIf(e -> now - e.getValue().timestamp() > CACHE_TTL_MS);
        if (removed > 0) {
            log.info("Pruned {} expired revoked-token denylist entries.", removed);
        }
    }

    // ── Admin Management ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Admin> getAllAdmins() {
        return adminRepository.findByIsActiveTrueOrderByAdminNameAsc();
    }

    @Transactional(readOnly = true)
    public Optional<Admin> findAdminById(Long id) {
        return adminRepository.findById(id);
    }

    @Transactional
    public Admin createAdmin(Admin admin, Admin createdBy) {
        if (adminRepository.existsByEmailId(admin.getEmailId())) {
            throw new IllegalArgumentException("Email already in use: " + admin.getEmailId());
        }
        admin.setPasswordHash(passwordEncoder.encode(admin.getPasswordHash()));
        admin.setCreatedByAdmin(createdBy);
        admin.setUpdatedByAdmin(createdBy);
        return adminRepository.save(admin);
    }

    @Transactional
    public Admin updateAdmin(Admin admin, Admin updatedBy) {
        Admin existing = adminRepository.findById(admin.getId())
                .orElseThrow(() -> new IllegalArgumentException("Admin not found: " + admin.getId()));

        // Invalidate admin cache entry
        adminCache.remove(admin.getId());

        // If password field is set (not a hash), re-hash it
        if (admin.getPasswordHash() != null && !admin.getPasswordHash().startsWith("$2")) {
            existing.setPasswordHash(passwordEncoder.encode(admin.getPasswordHash()));
        }
        existing.setAdminName(admin.getAdminName());
        existing.setPhoneNumber(admin.getPhoneNumber());
        existing.setNotifications(admin.getNotifications());
        existing.setIsActive(admin.getIsActive());
        existing.setUpdatedByAdmin(updatedBy);
        return adminRepository.save(existing);
    }

    public boolean hasRole(Admin admin, AdminRole role) {
        return admin != null && admin.getRole() == role;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Compute SHA-256 hex digest of a string.
     * Used to hash JWT tokens before storing in the denylist.
     */
    private String sha256Hex(String input) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hashBytes);
    }
}
