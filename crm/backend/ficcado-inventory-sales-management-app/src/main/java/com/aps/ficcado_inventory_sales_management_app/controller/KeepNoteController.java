package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.KeepNote;
import com.aps.ficcado_inventory_sales_management_app.service.KeepNoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

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
                .stream().map(NoteResponse::from).toList();
    }

    @PostMapping
    @Operation(summary = "Create a note")
    public ResponseEntity<NoteResponse> create(@RequestBody NoteRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        KeepNote note = keepNoteService.createNote(request.noteContent(), admin);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(NoteResponse.from(note));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a note")
    public ResponseEntity<NoteResponse> update(@PathVariable Long id,
                                               @RequestBody NoteRequest request,
                                               @AuthenticationPrincipal Admin admin) {
        return keepNoteService.updateNote(id, request.noteContent(), admin)
                .map(NoteResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a note")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        boolean deleted = keepNoteService.deleteNote(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record NoteRequest(String noteContent) {}

    record NoteResponse(Long id, String noteContent,
                        Long createdByAdminId, String createdByAdminName,
                        Instant createdAt, Instant updatedAt) {
        static NoteResponse from(KeepNote n) {
            return new NoteResponse(
                    n.getId(), n.getNoteContent(),
                    n.getCreatedByAdmin() != null ? n.getCreatedByAdmin().getId() : null,
                    n.getCreatedByAdmin() != null ? n.getCreatedByAdmin().getAdminName() : null,
                    n.getCreatedAt(), n.getUpdatedAt());
        }
    }
}
