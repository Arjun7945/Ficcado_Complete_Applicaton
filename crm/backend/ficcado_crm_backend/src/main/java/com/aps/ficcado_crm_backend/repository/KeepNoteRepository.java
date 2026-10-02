package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.KeepNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KeepNoteRepository extends JpaRepository<KeepNote, Long> {

    List<KeepNote> findAllByOrderByUpdatedAtDesc();
}
