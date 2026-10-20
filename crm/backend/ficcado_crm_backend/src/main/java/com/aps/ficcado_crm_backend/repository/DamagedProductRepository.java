package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.DamagedProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DamagedProductRepository extends JpaRepository<DamagedProduct, Long> {

    List<DamagedProduct> findBySaleId(Long saleId);

    List<DamagedProduct> findByItemId(Long itemId);
}
