package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Customer;
import com.aps.ficcado_inventory_sales_management_app.entity.CustomerAddress;
import com.aps.ficcado_inventory_sales_management_app.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "List all customers")
    public List<CustomerResponse> getAll() {
        return customerService.getAll().stream().map(CustomerResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get customer by ID")
    public ResponseEntity<CustomerResponse> getById(@PathVariable Long id) {
        return customerService.findById(id)
                .map(CustomerResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/lookup")
    @Operation(summary = "Phone-number autofill lookup for sale creation modal")
    public ResponseEntity<CustomerResponse> lookupByPhone(@RequestParam String phone) {
        return customerService.findByPhone(phone)
                .map(CustomerResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PutMapping
    @Operation(summary = "Update customer profile and addresses")
    public ResponseEntity<CustomerResponse> update(@RequestBody CustomerUpdateRequest request,
                                                   @AuthenticationPrincipal Admin admin) {
        Customer updated = customerService.updateCustomer(
                request.phone(),
                request.name(),
                request.email(),
                request.addresses(),
                admin
        );
        return ResponseEntity.ok(CustomerResponse.from(updated));
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record CustomerUpdateRequest(String phone, String name, String email, List<String> addresses) {}

    record AddressDto(Long id, String address, boolean isDefault) {
        static AddressDto from(CustomerAddress a) {
            return new AddressDto(a.getId(), a.getAddress(), Boolean.TRUE.equals(a.getIsDefault()));
        }
    }

    record CustomerResponse(Long id, String customerName, String phoneNumber,
                             String emailId, int totalOrdersPlaced,
                             List<AddressDto> addresses) {
        static CustomerResponse from(Customer c) {
            return new CustomerResponse(
                    c.getId(), c.getCustomerName(), c.getPhoneNumber(),
                    c.getEmailId(), c.getTotalOrdersPlaced(),
                    c.getAddresses().stream().map(AddressDto::from).toList());
        }
    }
}
