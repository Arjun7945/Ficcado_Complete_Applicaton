package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.DamagedProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DamagedProductRepository extends JpaRepository<DamagedProduct, Long> {

    List<DamagedProduct> findBySaleId(Long saleId);

    List<DamagedProduct> findByItemId(Long itemId);
}
