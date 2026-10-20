package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByItemIdAndSize(Long itemId, String size);

    List<Inventory> findByItemId(Long itemId);

    /**
     * Calculates unallocated quantity for a given item+size:
     * inventory.total_quantity minus the sum of all warehouse_allocations for that item+size.
     * Used to enforce the warehouse allocation cap.
     */
    @Query("""
        SELECT i.totalQuantity - COALESCE(SUM(w.quantity), 0)
        FROM Inventory i
        LEFT JOIN WarehouseAllocation w ON w.item.id = i.item.id AND w.size = i.size
        WHERE i.item.id = :itemId AND i.size = :size
        GROUP BY i.totalQuantity
    """)
    Optional<Integer> findUnallocatedQuantity(@Param("itemId") Long itemId, @Param("size") String size);

    @Query("SELECT i FROM Inventory i JOIN FETCH i.item ORDER BY i.item.itemName ASC, i.size ASC")
    List<Inventory> findAllWithItem();
}
