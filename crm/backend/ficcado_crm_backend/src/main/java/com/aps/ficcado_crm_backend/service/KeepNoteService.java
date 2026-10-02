package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.KeepNote;
import com.aps.ficcado_crm_backend.repository.KeepNoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class KeepNoteService {

    private final KeepNoteRepository keepNoteRepository;

    @Transactional(readOnly = true)
    public List<KeepNote> getAll() {
        return keepNoteRepository.findAllByOrderByUpdatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Optional<KeepNote> getById(Long id) {
        return keepNoteRepository.findById(id);
    }

    @Transactional
    public KeepNote createNote(String noteContent, Admin admin) {
        KeepNote note = KeepNote.builder()
                .noteContent(noteContent)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();
        KeepNote saved = keepNoteRepository.save(note);
        log.info("Note created [id={}, admin={}]", saved.getId(),
                admin != null ? admin.getAdminName() : "system");
        return saved;
    }

    @Transactional
    public Optional<KeepNote> updateNote(Long id, String noteContent, Admin admin) {
        return keepNoteRepository.findById(id).map(note -> {
            note.setNoteContent(noteContent);
            note.setUpdatedByAdmin(admin);
            KeepNote saved = keepNoteRepository.save(note);
            log.info("Note updated [id={}]", id);
            return saved;
        });
    }

    @Transactional
    public boolean deleteNote(Long id) {
        if (keepNoteRepository.existsById(id)) {
            keepNoteRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
