package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.CustomerComplaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<CustomerComplaint, Long> {

    Optional<CustomerComplaint> findByComplaintId(String complaintId);

    List<CustomerComplaint> findByCustomerEmailOrderByCreatedAtDesc(String customerEmail);
}
