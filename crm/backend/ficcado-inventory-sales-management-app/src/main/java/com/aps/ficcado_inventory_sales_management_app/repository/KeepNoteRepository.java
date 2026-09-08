package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.KeepNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KeepNoteRepository extends JpaRepository<KeepNote, Long> {

    List<KeepNote> findAllByOrderByUpdatedAtDesc();
}
