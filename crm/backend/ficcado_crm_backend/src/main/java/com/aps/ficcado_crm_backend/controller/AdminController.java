package com.aps.ficcado_crm_backend.controller;

import com.aps.ficcado_crm_backend.dto.AdminDto.AdminCreateRequest;
import com.aps.ficcado_crm_backend.dto.AdminDto.AdminResponse;
import com.aps.ficcado_crm_backend.dto.AdminDto.AdminUpdateRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.entity.enums.NotificationSetting;
import com.aps.ficcado_crm_backend.mapper.AdminMapper;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping("/api/admins")
@Tag(name = "Admins")
@RequiredArgsConstructor
public class AdminController {

    private final AuthService authService;
    private final ActivityLogService activityLogService;

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @GetMapping
    @Operation(summary = "List all active admins (SUPERADMIN or ADMIN)")
    public List<AdminResponse> getAll() {
        log.debug("GET /api/admins - listing all admins");
        return authService.getAllAdmins().stream()
                .map(AdminMapper::toResponse)
                .toList();
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN') or #id == authentication.principal.id")
    @GetMapping("/{id}")
    @Operation(summary = "Get admin by ID (SUPERADMIN, ADMIN or self)")
    public ResponseEntity<AdminResponse> getById(@PathVariable Long id) {
        log.debug("GET /api/admins/{} - getting admin by id", id);
        return authService.findAdminById(id)
                .map(AdminMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PostMapping
    @Operation(summary = "Create admin (SUPERADMIN or ADMIN)")
    public ResponseEntity<AdminResponse> create(@Valid @RequestBody AdminCreateRequest request,
                                                @AuthenticationPrincipal Admin currentAdmin) {
        log.info("Creating admin account: {} ({})", request.adminName(), request.emailId());
        if (!authService.hasRole(currentAdmin, AdminRole.SUPERADMIN) && !authService.hasRole(currentAdmin, AdminRole.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Admin newAdmin = Admin.builder()
                .adminName(request.adminName())
                .emailId(request.emailId())
                .phoneNumber(request.phoneNumber())
                .passwordHash(request.password())   // AuthService will hash this
                .role(request.role() != null ? AdminRole.fromString(request.role()) : AdminRole.ADMIN)
                .notifications(NotificationSetting.ENABLED)
                .isActive(true)
                .build();

        Admin saved = authService.createAdmin(newAdmin, currentAdmin);
        activityLogService.log(currentAdmin, "CREATE", "ADMINS", "admins",
                saved.getId().toString(), "Admin created: " + saved.getAdminName());
        return ResponseEntity.status(HttpStatus.CREATED).body(AdminMapper.toResponse(saved));
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN') or #id == authentication.principal.id")
    @PutMapping("/{id}")
    @Operation(summary = "Update admin (SUPERADMIN, ADMIN or self)")
    public ResponseEntity<AdminResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody AdminUpdateRequest request,
                                                @AuthenticationPrincipal Admin currentAdmin) {
        log.info("Updating admin account [id={}]", id);
        boolean hasAdminAccess = authService.hasRole(currentAdmin, AdminRole.SUPERADMIN) || authService.hasRole(currentAdmin, AdminRole.ADMIN);
        boolean isSelf = currentAdmin.getId().equals(id);

        if (!hasAdminAccess && !isSelf) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return authService.findAdminById(id).map(existing -> {
            if (request.adminName() != null) existing.setAdminName(request.adminName());
            if (request.phoneNumber() != null) existing.setPhoneNumber(request.phoneNumber());
            if (request.notifications() != null)
                existing.setNotifications(NotificationSetting.fromString(request.notifications()));
            if (request.password() != null && !request.password().isBlank())
                existing.setPasswordHash(request.password());   // AuthService will hash if not a bcrypt string
            if (hasAdminAccess && request.isActive() != null)
                existing.setIsActive(request.isActive());

            Admin saved = authService.updateAdmin(existing, currentAdmin);
            activityLogService.log(currentAdmin, "UPDATE", "ADMINS", "admins",
                id.toString(), "Admin updated: " + saved.getAdminName());
            return ResponseEntity.ok(AdminMapper.toResponse(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")
    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate admin (soft delete, SUPERADMIN or ADMIN)")
    public ResponseEntity<Void> deactivate(@PathVariable Long id,
                                           @AuthenticationPrincipal Admin currentAdmin) {
        log.info("Deactivating admin [id={}]", id);
        if (!authService.hasRole(currentAdmin, AdminRole.SUPERADMIN) && !authService.hasRole(currentAdmin, AdminRole.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        var maybeAdmin = authService.findAdminById(id);
        if (maybeAdmin.isEmpty()) return ResponseEntity.<Void>notFound().build();

        Admin admin = maybeAdmin.get();
        admin.setIsActive(false);
        authService.updateAdmin(admin, currentAdmin);
        activityLogService.log(currentAdmin, "DEACTIVATE", "ADMINS", "admins",
                id.toString(), "Admin deactivated: " + admin.getAdminName());
        return ResponseEntity.<Void>noContent().build();
    }
}
