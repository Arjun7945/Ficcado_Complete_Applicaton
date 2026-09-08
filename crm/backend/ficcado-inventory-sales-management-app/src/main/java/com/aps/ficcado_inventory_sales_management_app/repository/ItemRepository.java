package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.Item;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.ItemStatus;
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


    @Query("SELECT i FROM Item i LEFT JOIN FETCH i.sizes WHERE i.currentStatus = :status ORDER BY i.itemName ASC")
    List<Item> findActiveItemsWithSizes(ItemStatus status);
}
