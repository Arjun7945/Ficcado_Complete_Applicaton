package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.CustomerEnquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnquiryRepository extends JpaRepository<CustomerEnquiry, Long> {

    Optional<CustomerEnquiry> findByTicketId(String ticketId);

    List<CustomerEnquiry> findByEmailOrderByCreatedAtDesc(String email);
}
