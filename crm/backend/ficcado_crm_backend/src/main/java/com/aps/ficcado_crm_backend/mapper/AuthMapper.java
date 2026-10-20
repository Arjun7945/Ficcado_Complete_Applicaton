package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.AuthDto.AdminSummary;
import com.aps.ficcado_crm_backend.entity.Admin;

public final class AuthMapper {

    private AuthMapper() {}

    public static AdminSummary toSummary(Admin admin) {
        if (admin == null) return null;
        return new AdminSummary(
                admin.getId(),
                admin.getAdminName(),
                admin.getEmailId(),
                admin.getRole() != null ? admin.getRole().name() : null,
                admin.getNotifications() != null ? admin.getNotifications().name() : null
        );
    }
}
