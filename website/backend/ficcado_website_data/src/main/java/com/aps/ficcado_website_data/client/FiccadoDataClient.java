package com.aps.ficcado_website_data.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

/**
 * Service-to-service internal REST client communicating with Ficcado-Data (Port 8081).
 *
 * Uses the shared INTERNAL_API_KEY secret header: X-Internal-Secret.
 * Degradation resilient: If Ficcado-Data is unreachable, catches errors and logs warnings.
 */
@Slf4j
@Component
public class FiccadoDataClient {

    private final RestClient restClient;
    private final String internalApiKey;

    public FiccadoDataClient(
            @Value("${ficcado.data.url:http://localhost:8081}") String ficcadoDataUrl,
            @Value("${app.internal.api-key:ficcado-internal-service-secret-key-change-in-prod}") String internalApiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(ficcadoDataUrl)
                .build();
        this.internalApiKey = internalApiKey;
    }

    /**
     * Checks if a customer exists in Ficcado-Data by email.
     */
    public boolean checkCustomerExists(String email) {
        if (email == null || email.isBlank()) return false;
        try {
            Map<?, ?> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/api/internal/customer/exists")
                            .queryParam("email", email.trim().toLowerCase())
                            .build())
                    .header("X-Internal-Secret", internalApiKey)
                    .retrieve()
                    .body(Map.class);

            return response != null && Boolean.TRUE.equals(response.get("exists"));
        } catch (Exception e) {
            log.warn("Failed to check customer existence with Ficcado-Data for email '{}': {}", email, e.getMessage());
            return false;
        }
    }

    /**
     * Executes internal password reset handshake with Ficcado-Data to store BCrypt hash,
     * set emailVerifiedAt, and invalidate all sessions.
     */
    public boolean resetCustomerPassword(String email, String newPassword) {
        try {
            log.info("Sending internal password reset request to Ficcado-Data for email: {}", email);
            Map<?, ?> response = restClient.post()
                    .uri("/api/internal/customer/reset-password")
                    .header("X-Internal-Secret", internalApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "email", email.trim().toLowerCase(),
                            "newPassword", newPassword
                    ))
                    .retrieve()
                    .body(Map.class);

            return response != null && Boolean.TRUE.equals(response.get("success"));
        } catch (Exception e) {
            log.error("Internal password reset with Ficcado-Data failed for email '{}': {}", email, e.getMessage());
            return false;
        }
    }
}
