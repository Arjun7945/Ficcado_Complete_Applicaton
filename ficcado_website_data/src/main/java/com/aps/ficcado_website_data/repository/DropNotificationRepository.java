package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.DropNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DropNotificationRepository extends JpaRepository<DropNotification, Long> {

    Optional<DropNotification> findByEmailAndCapsuleName(String email, String capsuleName);

    List<DropNotification> findByEmail(String email);
}
