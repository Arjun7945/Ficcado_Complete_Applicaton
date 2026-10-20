package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.NoteDto.NoteResponse;
import com.aps.ficcado_crm_backend.entity.KeepNote;

public final class NoteMapper {

    private NoteMapper() {}

    public static NoteResponse toResponse(KeepNote n) {
        if (n == null) return null;
        return new NoteResponse(
                n.getId(),
                n.getNoteContent(),
                n.getCreatedByAdmin() != null ? n.getCreatedByAdmin().getId() : null,
                n.getCreatedByAdmin() != null ? n.getCreatedByAdmin().getAdminName() : null,
                n.getCreatedAt(),
                n.getUpdatedAt()
        );
    }
}
