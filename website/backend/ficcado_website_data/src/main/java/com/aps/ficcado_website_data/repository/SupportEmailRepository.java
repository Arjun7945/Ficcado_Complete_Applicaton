package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.SupportEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportEmailRepository extends JpaRepository<SupportEmail, Long> {

    List<SupportEmail> findByRecipientEmailOrderByCreatedAtDesc(String recipientEmail);
}
