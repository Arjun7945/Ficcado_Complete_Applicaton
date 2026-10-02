package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findByCurrentStatus(ItemStatus status);

    List<Item> findByCurrentStatusOrderByItemNameAsc(ItemStatus status);

    Optional<Item> findByItemNameIgnoreCase(String name);

    List<Item> findByItemNameContainingIgnoreCase(String name);


    @Query("SELECT i FROM Item i LEFT JOIN FETCH i.sizes WHERE i.currentStatus IN (com.aps.ficcado_crm_backend.entity.enums.ItemStatus.ACTIVE, com.aps.ficcado_crm_backend.entity.enums.ItemStatus.IN_STOCK) ORDER BY i.itemName ASC")
    List<Item> findActiveItemsWithSizes();

    @Query("SELECT i FROM Item i LEFT JOIN FETCH i.sizes WHERE i.currentStatus = :status ORDER BY i.itemName ASC")
    List<Item> findActiveItemsWithSizes(ItemStatus status);

    @Query(value = """
        SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END FROM (
            SELECT 1 FROM inventory WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM sale_line_items WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM warehouse_allocations WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM damaged_products WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM return_refund_items WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM replacement_old_items WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM replacement_new_items WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM reviews WHERE item_id = :itemId
            UNION ALL
            SELECT 1 FROM inventory_history WHERE item_id = :itemId
        ) t
        """, nativeQuery = true)
    boolean hasLinkedRecords(@org.springframework.data.repository.query.Param("itemId") Long itemId);
}

