package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.ItemImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemImageRepository extends JpaRepository<ItemImage, Long> {

    /** All images for an item, ordered by display_order ascending. */
    List<ItemImage> findByItemIdOrderByDisplayOrderAsc(Long itemId);

    /**
     * Cover image (display_order = 1) for a given item.
     * Used to display the thumbnail everywhere the item is referenced across the CRM.
     */
    @Query("""
        SELECT img FROM ItemImage img
        WHERE img.item.id = :itemId
        ORDER BY img.displayOrder ASC
    """)
    List<ItemImage> findByItemIdOrderedByDisplayOrder(@Param("itemId") Long itemId);

    /** Count of images for an item — used to enforce per-item upload limit. */
    int countByItemId(Long itemId);

    /** Highest display_order value for an item — used when appending a new image. */
    @Query("SELECT COALESCE(MAX(img.displayOrder), 0) FROM ItemImage img WHERE img.item.id = :itemId")
    int findMaxDisplayOrderByItemId(@Param("itemId") Long itemId);
}
