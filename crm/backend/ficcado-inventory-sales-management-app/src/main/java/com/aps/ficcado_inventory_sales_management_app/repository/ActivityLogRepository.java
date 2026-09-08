package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByAdminIdOrderByLoggedAtDesc(Long adminId);

    /** Most recent 100 activity entries — for dashboard activity widget. */
    List<ActivityLog> findTop100ByOrderByLoggedAtDesc();

    /**
     * Keyset/cursor-based pagination for the full activity log list.
     * Pass the id of the last-seen row as lastSeenId; for the first page use Long.MAX_VALUE.
     */
    @Query("""
        SELECT al FROM ActivityLog al
        WHERE al.id < :lastSeenId
        ORDER BY al.id DESC
    """)
    List<ActivityLog> findPageBeforeId(@Param("lastSeenId") Long lastSeenId, Pageable pageable);

    int deleteByLoggedAtBefore(java.time.Instant cutoff);
}
