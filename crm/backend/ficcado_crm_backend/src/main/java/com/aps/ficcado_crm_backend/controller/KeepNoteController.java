package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.NoteDto.NoteRequest;
import com.aps.ficcado_crm_backend.dto.NoteDto.NoteResponse;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.KeepNote;
import com.aps.ficcado_crm_backend.mapper.NoteMapper;
import com.aps.ficcado_crm_backend.service.KeepNoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/keep-notes")
@Tag(name = "Keep Notes")
@RequiredArgsConstructor
public class KeepNoteController {

    private final KeepNoteService keepNoteService;

    @GetMapping
    @Operation(summary = "List all notes (most recently updated first)")
    public List<NoteResponse> getAll() {
        return keepNoteService.getAll()
                .stream()
                .map(NoteMapper::toResponse)
                .toList();
    }

    @PostMapping
    @Operation(summary = "Create a note")
    public ResponseEntity<NoteResponse> create(@Valid @RequestBody NoteRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        log.info("Creating keep note");
        KeepNote note = keepNoteService.createNote(request.noteContent(), admin);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(NoteMapper.toResponse(note));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a note")
    public ResponseEntity<NoteResponse> update(@PathVariable Long id,
                                               @Valid @RequestBody NoteRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        log.info("Updating keep note [id={}]", id);
        return keepNoteService.updateNote(id, request.noteContent(), admin)
                .map(NoteMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a note")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("Deleting keep note [id={}]", id);
        boolean deleted = keepNoteService.deleteNote(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
