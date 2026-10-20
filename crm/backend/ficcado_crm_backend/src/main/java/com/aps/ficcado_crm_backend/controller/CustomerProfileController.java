package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.CustomerProfileResponse;
import com.aps.ficcado_crm_backend.dto.CustomerAuthDto.UpdateProfileRequest;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import com.aps.ficcado_crm_backend.service.CustomerAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Customer Profile Management Controller.
 *
 * Strict ownership enforcement: All actions operate ONLY on the authenticated
 * Customer principal loaded from the JWT token.
 */
@Slf4j
@RestController
@RequestMapping("/api/customer/profile")
@Tag(name = "Customer Profile")
@RequiredArgsConstructor
public class CustomerProfileController {

    private final CustomerRepository customerRepository;
    private final CustomerAuthService customerAuthService;

    @GetMapping
    @Operation(summary = "Get current customer profile")
    public ResponseEntity<CustomerProfileResponse> getProfile(@AuthenticationPrincipal Customer customer) {
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Customer fresh = customerRepository.findById(customer.getId()).orElse(customer);
        return ResponseEntity.ok(customerAuthService.mapToProfileResponse(fresh));
    }

    @PutMapping
    @Transactional
    @Operation(summary = "Update customer name or phone")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal Customer customer,
            @RequestBody UpdateProfileRequest request) {
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Customer existing = customerRepository.findById(customer.getId())
                .orElseThrow(() -> new IllegalStateException("Customer not found"));

        if (request.name() != null && !request.name().isBlank()) {
            existing.setCustomerName(request.name().trim());
        }

        if (request.phone() != null && !request.phone().isBlank()) {
            String normalized = CustomerAuthService.normalizePhone(request.phone());
            // Check if phone already belongs to someone else
            customerRepository.findByPhoneNumber(normalized).ifPresent(other -> {
                if (!other.getId().equals(existing.getId())) {
                    throw new IllegalArgumentException("Phone number is already associated with another account");
                }
            });
            existing.setPhoneNumber(normalized);
        }

        if (request.address() != null && !request.address().isBlank()) {
            CustomerAddress address = CustomerAddress.builder()
                    .customer(existing)
                    .address(request.address().trim())
                    .isDefault(existing.getAddresses().isEmpty())
                    .build();
            existing.getAddresses().add(address);
        }

        Customer saved = customerRepository.save(existing);
        log.info("Customer profile updated [id={}]", saved.getId());
        return ResponseEntity.ok(customerAuthService.mapToProfileResponse(saved));
    }

    @PostMapping("/addresses")
    @Transactional
    @Operation(summary = "Add a new saved address")
    public ResponseEntity<?> addAddress(
            @AuthenticationPrincipal Customer customer,
            @RequestBody Map<String, Object> body) {
        if (customer == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String rawAddress = (String) body.get("address");
        if (rawAddress == null || rawAddress.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Address is required"));
        }

        Customer existing = customerRepository.findById(customer.getId())
                .orElseThrow(() -> new IllegalStateException("Customer not found"));

        boolean isDefault = Boolean.TRUE.equals(body.get("isDefault")) || existing.getAddresses().isEmpty();
        if (isDefault) {
            existing.getAddresses().forEach(a -> a.setIsDefault(false));
        }

        CustomerAddress newAddr = CustomerAddress.builder()
                .customer(existing)
                .address(rawAddress.trim())
                .isDefault(isDefault)
                .build();
        existing.getAddresses().add(newAddr);

        Customer saved = customerRepository.save(existing);
        return ResponseEntity.status(HttpStatus.CREATED).body(customerAuthService.mapToProfileResponse(saved));
    }
}
