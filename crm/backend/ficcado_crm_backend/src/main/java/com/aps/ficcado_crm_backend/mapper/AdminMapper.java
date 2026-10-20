package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.AdminDto.AdminResponse;
import com.aps.ficcado_crm_backend.entity.Admin;

public final class AdminMapper {

    private AdminMapper() {}

    public static AdminResponse toResponse(Admin a) {
        if (a == null) return null;
        return new AdminResponse(
                a.getId(),
                a.getAdminName(),
                a.getEmailId(),
                a.getPhoneNumber(),
                a.getRole() != null ? a.getRole().name() : null,
                a.getNotifications() != null ? a.getNotifications().name() : null,
                Boolean.TRUE.equals(a.getIsActive()),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
