package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByEmailAndTokenHashAndConsumedFalse(String email, String tokenHash);

    Optional<PasswordResetToken> findTopByEmailAndConsumedFalseOrderByCreatedAtDesc(String email);
}
