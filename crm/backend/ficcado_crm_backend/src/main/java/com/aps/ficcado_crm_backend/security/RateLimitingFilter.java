package com.aps.ficcado_crm_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * IP-based sliding window rate limiter filter to protect sensitive endpoints
 * against brute-force attacks and resource exhaustion (BE-008).
 *
 * Limits:
 * - /api/auth/login: 10 requests / minute / IP
 * - /api/public/reviews/**: 30 requests / minute / IP
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final int LOGIN_LIMIT_PER_MINUTE = 10;
    private static final int REVIEW_LIMIT_PER_MINUTE = 30;
    private static final long WINDOW_MS = 60_000L;

    private final ConcurrentHashMap<String, RequestCounter> loginCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, RequestCounter> reviewCounters = new ConcurrentHashMap<>();

    private record RequestCounter(AtomicInteger count, long windowStart) {}

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String clientIp = getClientIp(request);

        if (path.startsWith("/api/auth/login") && "POST".equalsIgnoreCase(request.getMethod())) {
            if (isRateLimited(loginCounters, clientIp, LOGIN_LIMIT_PER_MINUTE)) {
                log.warn("Rate limit exceeded for login attempts from IP: {}", clientIp);
                sendRateLimitResponse(response, "Too many login attempts. Please try again in a minute.");
                return;
            }
        } else if (path.startsWith("/api/public/reviews")) {
            if (isRateLimited(reviewCounters, clientIp, REVIEW_LIMIT_PER_MINUTE)) {
                log.warn("Rate limit exceeded for public reviews from IP: {}", clientIp);
                sendRateLimitResponse(response, "Too many review requests. Please try again in a minute.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isRateLimited(ConcurrentHashMap<String, RequestCounter> counters, String ip, int limit) {
        long now = System.currentTimeMillis();
        // Periodically cleanup expired entries
        if (counters.size() > 500) {
            counters.entrySet().removeIf(e -> (now - e.getValue().windowStart()) > WINDOW_MS);
        }

        RequestCounter counter = counters.compute(ip, (k, existing) -> {
            if (existing == null || (now - existing.windowStart()) > WINDOW_MS) {
                return new RequestCounter(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        return counter != null && counter.count().get() > limit;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader("Retry-After", "60");
        String json = String.format(
                "{\"type\":\"urn:ficcado:rate-limit-exceeded\",\"title\":\"Too Many Requests\",\"status\":429,\"detail\":\"%s\"}",
                message
        );
        response.getWriter().write(json);
    }
}
