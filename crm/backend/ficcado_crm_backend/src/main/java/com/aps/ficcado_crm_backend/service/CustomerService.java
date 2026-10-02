package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

/**
 * Manages customer records.
 * Migrated from app/api/customer-info/ and the customer upsert logic in sales creation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    /**
     * Phone-number autofill lookup — used in the New Sale modal.
     * Returns the customer if found, empty if no match.
     */
    @Transactional(readOnly = true)
    public Optional<Customer> findByPhone(String phone) {
        if (phone == null || phone.isBlank()) return Optional.empty();
        log.debug("Looking up customer by phone: {}", phone);
        String clean = phone.trim();
        Optional<Customer> exact = customerRepository.findByPhoneNumber(clean);
        if (exact.isPresent()) return exact;

        // Try matching by trailing digits if input has at least 7 digits (e.g. 10-digit mobile number)
        String digitsOnly = clean.replaceAll("\\D", "");
        if (digitsOnly.length() >= 7) {
            String suffix = digitsOnly.length() >= 10 ? digitsOnly.substring(digitsOnly.length() - 10) : digitsOnly;
            List<Customer> matches = customerRepository.findByPhoneNumberEndingWith(suffix);
            if (!matches.isEmpty()) {
                return Optional.of(matches.get(0));
            }
        }
        return Optional.empty();
    }

    /**
     * Upsert called on every sale creation:
     * - If phone number is new → create customer row
     * - If phone number exists → update name/email if changed, increment order count, add address if new
     *
     * This mirrors the existing Next.js logic that maintained customer_info in lock-step with sales.
     */
    @Transactional
    public Customer upsertOnSaleCreation(String phone, String name, String email,
                                         String address, Admin performedByAdmin) {
        log.info("Upserting customer for sale creation with phone: {} by admin: {}",
                phone, performedByAdmin != null ? performedByAdmin.getAdminName() : "system");
        return customerRepository.findByPhoneNumber(phone).map(existing -> {

            // Update fields if they've changed
            if (name != null && !name.isBlank()) existing.setCustomerName(name);
            if (email != null && !email.isBlank()) existing.setEmailId(email);

            // Add address if it's new (not already saved)
            if (address != null && !address.isBlank()) {
                boolean alreadySaved = existing.getAddresses().stream()
                        .anyMatch(a -> a.getAddress().equalsIgnoreCase(address.trim()));
                if (!alreadySaved) {
                    CustomerAddress newAddr = CustomerAddress.builder()
                            .customer(existing)
                            .address(address.trim())
                            .isDefault(existing.getAddresses().isEmpty())
                            .build();
                    existing.getAddresses().add(newAddr);
                }
            }

            existing.setTotalOrdersPlaced(existing.getTotalOrdersPlaced() + 1);
            existing.setUpdatedByAdmin(performedByAdmin);
            return customerRepository.save(existing);

        }).orElseGet(() -> {
            // New customer
            Customer newCustomer = Customer.builder()
                    .customerName(name)
                    .phoneNumber(phone)
                    .emailId(email)
                    .totalOrdersPlaced(1)
                    .createdByAdmin(performedByAdmin)
                    .updatedByAdmin(performedByAdmin)
                    .build();

            if (address != null && !address.isBlank()) {
                CustomerAddress addr = CustomerAddress.builder()
                        .customer(newCustomer)
                        .address(address.trim())
                        .isDefault(true)
                        .build();
                newCustomer.getAddresses().add(addr);
            }

            return customerRepository.save(newCustomer);
        });
    }

    @Transactional(readOnly = true)
    public List<Customer> getAll() {
        return customerRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Customer> findById(Long id) {
        return customerRepository.findById(id);
    }

    @Transactional
    public Customer updateCustomer(String phone, String name, String email, List<String> addresses, Admin admin) {
        log.info("Updating customer with phone: {} by admin: {}", phone, admin != null ? admin.getAdminName() : "system");
        Customer customer = customerRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found with phone: " + phone));


        if (name != null && !name.isBlank()) {
            customer.setCustomerName(name.trim());
        }
        if (email != null) {
            customer.setEmailId(email.trim());
        }
        if (addresses != null) {
            customer.getAddresses().clear();
            List<String> validAddresses = addresses.stream()
                    .filter(addr -> addr != null && !addr.isBlank())
                    .map(String::trim)
                    .toList();
            IntStream.range(0, validAddresses.size())
                    .mapToObj(i -> CustomerAddress.builder()
                            .customer(customer)
                            .address(validAddresses.get(i))
                            .isDefault(i == 0)
                            .build())
                    .forEach(customer.getAddresses()::add);
        }
        customer.setUpdatedByAdmin(admin);
        return customerRepository.save(customer);
    }
}
