package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {

    Optional<Admin> findByEmailId(String emailId);

    /**
     * Case-insensitive email lookup — used by {@code AuthService.authenticate()}
     * for email-only CRM login. Username-based lookup is intentionally excluded.
     */
    Optional<Admin> findByEmailIdIgnoreCase(String emailId);

    /**
     * Kept for reference / legacy compatibility but NOT called by authenticate().
     * CRM login is email-only; this dual-lookup is no longer used in the auth path.
     */
    Optional<Admin> findByEmailIdIgnoreCaseOrAdminNameIgnoreCase(String emailId, String adminName);

    Optional<Admin> findByAdminNameIgnoreCase(String adminName);

    boolean existsByEmailId(String emailId);

    List<Admin> findByIsActiveTrue();

    List<Admin> findByRole(AdminRole role);

    List<Admin> findByIsActiveTrueOrderByAdminNameAsc();
}
