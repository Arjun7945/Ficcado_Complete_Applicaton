package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByPhoneNumber(String phoneNumber);

    List<Customer> findByPhoneNumberEndingWith(String suffix);

    boolean existsByPhoneNumber(String phoneNumber);

    Optional<Customer> findByEmailIdIgnoreCase(String emailId);

    boolean existsByEmailIdIgnoreCase(String emailId);
}
