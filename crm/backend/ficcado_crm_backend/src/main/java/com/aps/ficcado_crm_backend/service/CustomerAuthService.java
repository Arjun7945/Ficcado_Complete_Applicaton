package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAddressDto;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerAuthResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerProfileResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerRegistrationRequest;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;
import com.aps.ficcado_crm_backend.entity.RevokedToken;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.repository.RevokedTokenRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

/**
 * Storefront Customer Authentication & Profile Service.
 *
 * Enforces:
 * - Customers identify primarily by Email (lowercased/trimmed).
 * - Phone numbers are mandatory (10 digits) to maintain CRM compatibility.
 * - Password hashing via BCrypt.
 * - Protection against account takeover for CRM-seeded sales customers (must verify email via OTP first).
 * - Customer JWT isolation: carry role ROLE_CUSTOMER and audience ficcado-customer.
 * - Per-device logout with revocation table check.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    public static final String CUSTOMER_ROLE = "ROLE_CUSTOMER";
    public static final String CUSTOMER_AUDIENCE = "ficcado-customer";
    public static final long CUSTOMER_JWT_BACKSTOP_MS = 30L * 24 * 60 * 60 * 1000L; // 30-day backstop

    private final CustomerRepository customerRepository;
    private final RevokedTokenRepository revokedTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final CustomerSessionService customerSessionService;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    // ── Registration ─────────────────────────────────────────────────────────

    @Transactional
    public CustomerAuthResponse registerCustomer(CustomerRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phone());

        // 1. Check if email already exists
        Optional<Customer> existingByEmail = customerRepository.findByEmailIdIgnoreCase(email);
        if (existingByEmail.isPresent()) {
            Customer c = existingByEmail.get();
            if (c.getPasswordHash() != null) {
                return new CustomerAuthResponse(false, "An account with this email already exists. Please sign in.", null, null);
            } else {
                // Customer was created from CRM sale by phone — cannot set password without OTP verification (Q-005 item 3)
                return new CustomerAuthResponse(false,
                        "This email is linked to prior orders. Please verify via email OTP to complete your account setup.",
                        null, null);
            }
        }

        // 2. Check if phone is already linked to another customer record with a different email
        Optional<Customer> existingByPhone = customerRepository.findByPhoneNumber(phone);
        if (existingByPhone.isPresent() && !existingByPhone.get().getEmailId().equalsIgnoreCase(email)) {
            return new CustomerAuthResponse(false,
                    "This mobile number is already associated with another account.", null, null);
        }

        // 3. Create customer
        Customer customer = existingByPhone.orElseGet(() -> Customer.builder()
                .customerName(request.name().trim())
                .phoneNumber(phone)
                .emailId(email)
                .totalOrdersPlaced(0)
                .build());

        customer.setCustomerName(request.name().trim());
        customer.setEmailId(email);
        customer.setPasswordHash(passwordEncoder.encode(request.password()));

        // Add default address if provided
        if (request.address() != null && !request.address().isBlank()) {
            CustomerAddress address = CustomerAddress.builder()
                    .customer(customer)
                    .address(request.address().trim())
                    .isDefault(true)
                    .build();
            customer.getAddresses().add(address);
        }

        Customer saved = customerRepository.save(customer);
        log.info("Customer registered successfully [id={}, email={}]", saved.getId(), saved.getEmailId());

        String token = generateCustomerToken(saved);
        return new CustomerAuthResponse(true, "Registration successful", token, mapToProfileResponse(saved));
    }

    // ── Authentication (Password) ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Optional<Customer> authenticate(String email, String rawPassword) {
        if (email == null || rawPassword == null) return Optional.empty();

        String normalizedEmail = normalizeEmail(email);
        return customerRepository.findByEmailIdIgnoreCase(normalizedEmail)
                .filter(customer -> customer.getPasswordHash() != null)
                .filter(customer -> passwordEncoder.matches(rawPassword, customer.getPasswordHash()));
    }

    // ── Authentication (OTP Handshake) ────────────────────────────────────────

    @Transactional
    public CustomerAuthResponse authenticateViaVerifiedOtp(String email, String phone, String name) {
        String normalizedEmail = normalizeEmail(email);
        Optional<Customer> opt = customerRepository.findByEmailIdIgnoreCase(normalizedEmail);

        Customer customer;
        if (opt.isPresent()) {
            customer = opt.get();
            customer.setEmailVerifiedAt(Instant.now());
            if (phone != null && !phone.isBlank() && customer.getPhoneNumber() == null) {
                customer.setPhoneNumber(normalizePhone(phone));
            }
        } else {
            // New OTP-based customer: create profile
            String effectivePhone = (phone != null && !phone.isBlank())
                    ? normalizePhone(phone)
                    : "OTP-" + System.currentTimeMillis();

            // Handle phone collision gracefully if phone exists
            if (customerRepository.existsByPhoneNumber(effectivePhone)) {
                effectivePhone = "OTP-" + System.currentTimeMillis();
            }

            customer = Customer.builder()
                    .customerName(name != null && !name.isBlank() ? name.trim() : "Valued Customer")
                    .emailId(normalizedEmail)
                    .phoneNumber(effectivePhone)
                    .emailVerifiedAt(Instant.now())
                    .totalOrdersPlaced(0)
                    .build();
        }

        Customer saved = customerRepository.save(customer);
        log.info("Customer authenticated via verified OTP [id={}, email={}]", saved.getId(), saved.getEmailId());

        String token = generateCustomerToken(saved);
        return new CustomerAuthResponse(true, "Authentication successful", token, mapToProfileResponse(saved));
    }

    // ── JWT Management ────────────────────────────────────────────────────────

    public String generateCustomerToken(Customer customer, String sessionId) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(customer.getId().toString())
                .audience().add(CUSTOMER_AUDIENCE).and()
                .claim("email", customer.getEmailId())
                .claim("role", CUSTOMER_ROLE)
                .claim("customerName", customer.getCustomerName())
                .claim("sid", sessionId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + CUSTOMER_JWT_BACKSTOP_MS))
                .signWith(key)
                .compact();
    }

    public String generateCustomerToken(Customer customer) {
        var session = customerSessionService.createSession(customer.getId());
        return generateCustomerToken(customer, session.sessionId());
    }

    public Claims validateCustomerToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        // Verify role and audience
        String role = claims.get("role", String.class);
        Set<String> audience = claims.getAudience();
        if (!CUSTOMER_ROLE.equals(role) || (audience != null && !audience.contains(CUSTOMER_AUDIENCE))) {
            throw new JwtException("Token is not a valid customer token");
        }

        return claims;
    }

    @Transactional(readOnly = true)
    public Optional<Customer> getCustomerFromToken(String token, boolean isUserInitiated) {
        try {
            if (isTokenRevoked(token)) {
                log.debug("Customer token is revoked");
                return Optional.empty();
            }

            Claims claims = validateCustomerToken(token);
            Long customerId = Long.parseLong(claims.getSubject());
            String sid = claims.get("sid", String.class);

            if (sid != null) {
                // Redis session store is the true authority
                var maybeSession = customerSessionService.validateSession(sid, isUserInitiated);
                if (maybeSession.isEmpty()) {
                    log.debug("Customer session in Redis is expired or missing [sid={}]", sid);
                    return Optional.empty();
                }
            }

            return customerRepository.findById(customerId);
        } catch (com.aps.ficcado_crm_backend.exception.SessionServiceUnavailableException e) {
            // Re-throw so caller can fail closed with 503
            throw e;
        } catch (Exception e) {
            log.warn("Invalid customer token: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Transactional(readOnly = true)
    public Optional<Customer> getCustomerFromToken(String token) {
        return getCustomerFromToken(token, true);
    }

    @Transactional
    public void revokeToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;

        try {
            Claims claims = validateCustomerToken(rawToken);
            String sid = claims.get("sid", String.class);
            if (sid != null) {
                customerSessionService.deleteSession(sid);
            }
            String hash = hashToken(rawToken);
            if (!revokedTokenRepository.existsByTokenHash(hash)) {
                RevokedToken revoked = RevokedToken.builder()
                        .tokenHash(hash)
                        .expiresAt(claims.getExpiration().toInstant())
                        .build();
                revokedTokenRepository.save(revoked);
                log.info("Customer token and Redis session revoked successfully on logout");
            }
        } catch (Exception e) {
            log.warn("Could not parse token during customer logout revocation: {}", e.getMessage());
        }
    }

    @Transactional
    public void changePassword(Long customerId, String newPassword) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        customer.setPasswordHash(passwordEncoder.encode(newPassword));
        customerRepository.save(customer);
        customerSessionService.deleteAllSessionsForCustomer(customerId);
        log.info("Customer password updated and all active sessions invalidated [customerId={}]", customerId);
    }

    public boolean isTokenRevoked(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return true;
        return revokedTokenRepository.existsByTokenHash(hashToken(rawToken));
    }

    // ── Mapping & Helpers ──────────────────────────────────────────────────────

    public CustomerProfileResponse mapToProfileResponse(Customer c) {
        if (c == null) return null;

        List<CustomerAddressDto> addressDtos = (c.getAddresses() != null)
                ? c.getAddresses().stream().map(a -> new CustomerAddressDto(
                        a.getId(), a.getAddress(), Boolean.TRUE.equals(a.getIsDefault()))).toList()
                : Collections.emptyList();

        return new CustomerProfileResponse(
                c.getId(),
                c.getCustomerName(),
                c.getEmailId(),
                c.getPhoneNumber(),
                c.getEmailVerifiedAt() != null,
                c.getPhoneVerifiedAt() != null,
                c.getTotalOrdersPlaced() != null ? c.getTotalOrdersPlaced() : 0,
                addressDtos
        );
    }

    public static String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase();
    }

    public static String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() > 10) {
            digits = digits.substring(digits.length() - 10);
        }
        return digits;
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedHash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
