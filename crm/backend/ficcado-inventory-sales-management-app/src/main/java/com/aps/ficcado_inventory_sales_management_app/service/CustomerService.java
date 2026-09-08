package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.Customer;
import com.aps.ficcado_inventory_sales_management_app.entity.CustomerAddress;
import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Manages customer records.
 * Migrated from app/api/customer-info/ and the customer upsert logic in sales creation.
 */
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
        return customerRepository.findByPhoneNumber(phone);
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
            boolean isFirst = true;
            for (String addr : addresses) {
                if (addr != null && !addr.isBlank()) {
                    customer.getAddresses().add(CustomerAddress.builder()
                            .customer(customer)
                            .address(addr.trim())
                            .isDefault(isFirst)
                            .build());
                    isFirst = false;
                }
            }
        }
        customer.setUpdatedByAdmin(admin);
        return customerRepository.save(customer);
    }
}
