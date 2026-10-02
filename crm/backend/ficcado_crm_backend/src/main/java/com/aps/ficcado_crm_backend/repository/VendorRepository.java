package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {

    List<Vendor> findByVendorNameContainingIgnoreCaseOrPurposeUseContainingIgnoreCase(
            String name, String purpose);

    List<Vendor> findByVendorType(String vendorType);

    @Query("SELECT v FROM Vendor v LEFT JOIN FETCH v.contactNumbers ORDER BY v.vendorName ASC")
    List<Vendor> findAllWithContactNumbers();
}
