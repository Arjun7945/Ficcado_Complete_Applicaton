package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.OtpRecord;
import com.aps.ficcado_website_data.entity.enums.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface OtpRecordRepository extends JpaRepository<OtpRecord, Long> {

    Optional<OtpRecord> findTopByEmailAndPurposeAndVerifiedFalseOrderByCreatedAtDesc(String email, OtpPurpose purpose);

    List<OtpRecord> findByEmailAndCreatedAtAfter(String email, Instant after);
}
