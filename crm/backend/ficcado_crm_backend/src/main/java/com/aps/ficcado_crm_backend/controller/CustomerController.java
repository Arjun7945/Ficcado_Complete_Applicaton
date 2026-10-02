package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.CustomerDto.CustomerResponse;
import com.aps.ficcado_crm_backend.dto.CustomerDto.CustomerUpdateRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.mapper.CustomerMapper;
import com.aps.ficcado_crm_backend.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "List all customers")
    public List<CustomerResponse> getAll() {
        log.debug("GET /api/customers - listing all customers");
        return customerService.getAll().stream()
                .map(CustomerMapper::toResponse)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get customer by ID")
    public ResponseEntity<CustomerResponse> getById(@PathVariable Long id) {
        log.debug("GET /api/customers/{} - getting customer by id", id);
        return customerService.findById(id)
                .map(CustomerMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/lookup")
    @Operation(summary = "Phone-number autofill lookup for sale creation modal")
    public ResponseEntity<CustomerResponse> lookupByPhone(@RequestParam String phone) {
        log.debug("GET /api/customers/lookup?phone={} - customer lookup", phone);
        return customerService.findByPhone(phone)
                .map(CustomerMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }


    @PutMapping
    @Operation(summary = "Update customer profile and addresses")
    public ResponseEntity<CustomerResponse> update(@Valid @RequestBody CustomerUpdateRequest request,
                                                   @AuthenticationPrincipal Admin admin) {
        log.info("Updating customer profile for phone: {}", request.phone());
        Customer updated = customerService.updateCustomer(
                request.phone(),
                request.name(),
                request.email(),
                request.addresses(),
                admin
        );
        return ResponseEntity.ok(CustomerMapper.toResponse(updated));
    }
}
