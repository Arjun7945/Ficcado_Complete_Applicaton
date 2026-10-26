package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.WarehouseAllocation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseAllocationRepository extends JpaRepository<WarehouseAllocation, Long> {

    List<WarehouseAllocation> findByHandlerAdminId(Long handlerAdminId);

    Optional<WarehouseAllocation> findByHandlerAdminIdAndItemIdAndSize(Long handlerAdminId, Long itemId, String size);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM WarehouseAllocation w WHERE w.handlerAdmin.id = :handlerAdminId AND w.item.id = :itemId AND w.size = :size")
    Optional<WarehouseAllocation> findByHandlerAdminIdAndItemIdAndSizeForUpdate(
            @Param("handlerAdminId") Long handlerAdminId,
            @Param("itemId") Long itemId,
            @Param("size") String size);

    List<WarehouseAllocation> findByItemIdAndSize(Long itemId, String size);

    List<WarehouseAllocation> findByWarehouseLocationIgnoreCase(String warehouseLocation);

    @Query("""
        SELECT w FROM WarehouseAllocation w
        JOIN FETCH w.item
        LEFT JOIN FETCH w.handlerAdmin
        ORDER BY w.warehouseLocation ASC
    """)
    List<WarehouseAllocation> findAllWithDetails();

    @Query("""
        SELECT SUM(w.quantity) FROM WarehouseAllocation w
        WHERE w.item.id = :itemId AND w.size = :size
    """)
    Optional<Integer> sumAllocatedQuantity(@Param("itemId") Long itemId, @Param("size") String size);
}
