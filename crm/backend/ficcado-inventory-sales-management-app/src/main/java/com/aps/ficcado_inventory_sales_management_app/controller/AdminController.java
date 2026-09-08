package com.aps.ficcado_inventory_sales_management_app.controller;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.AdminRole;
import com.aps.ficcado_inventory_sales_management_app.entity.enums.NotificationSetting;
import com.aps.ficcado_inventory_sales_management_app.service.ActivityLogService;
import com.aps.ficcado_inventory_sales_management_app.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admins")
@Tag(name = "Admins")
@RequiredArgsConstructor
public class AdminController {

    private final AuthService authService;
    private final ActivityLogService activityLogService;

    @PreAuthorize("hasRole('SUPERADMIN')")
    @GetMapping
    @Operation(summary = "List all active admins (SUPERADMIN only)")
    public List<AdminResponse> getAll() {
        return authService.getAllAdmins().stream().map(AdminResponse::from).toList();
    }

    @PreAuthorize("hasRole('SUPERADMIN') or #id == authentication.principal.id")
    @GetMapping("/{id}")
    @Operation(summary = "Get admin by ID (SUPERADMIN or self)")
    public ResponseEntity<AdminResponse> getById(@PathVariable Long id) {
        return authService.findAdminById(id)
                .map(AdminResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PostMapping
    @Operation(summary = "Create admin (SUPERADMIN only)")
    public ResponseEntity<AdminResponse> create(@RequestBody AdminCreateRequest request,
                                                @AuthenticationPrincipal Admin currentAdmin) {
        if (!authService.hasRole(currentAdmin, AdminRole.SUPERADMIN)) {
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
        return ResponseEntity.status(HttpStatus.CREATED).body(AdminResponse.from(saved));
    }

    @PreAuthorize("hasRole('SUPERADMIN') or #id == authentication.principal.id")
    @PutMapping("/{id}")
    @Operation(summary = "Update admin (SUPERADMIN or self)")
    public ResponseEntity<AdminResponse> update(@PathVariable Long id,
                                                @RequestBody AdminUpdateRequest request,
                                                @AuthenticationPrincipal Admin currentAdmin) {
        boolean isSuperadmin = authService.hasRole(currentAdmin, AdminRole.SUPERADMIN);
        boolean isSelf = currentAdmin.getId().equals(id);

        if (!isSuperadmin && !isSelf) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return authService.findAdminById(id).map(existing -> {
            existing.setAdminName(request.adminName());
            existing.setPhoneNumber(request.phoneNumber());
            if (request.notifications() != null)
                existing.setNotifications(NotificationSetting.fromString(request.notifications()));
            if (request.password() != null && !request.password().isBlank())
                existing.setPasswordHash(request.password());   // AuthService will hash if not a bcrypt string
            if (isSuperadmin && request.isActive() != null)
                existing.setIsActive(request.isActive());

            Admin saved = authService.updateAdmin(existing, currentAdmin);
            activityLogService.log(currentAdmin, "UPDATE", "ADMINS", "admins",
                    id.toString(), "Admin updated: " + saved.getAdminName());
            return ResponseEntity.ok(AdminResponse.from(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('SUPERADMIN')")
    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Deactivate admin (soft delete, SUPERADMIN only)")
    public ResponseEntity<Void> deactivate(@PathVariable Long id,
                                           @AuthenticationPrincipal Admin currentAdmin) {
        if (!authService.hasRole(currentAdmin, AdminRole.SUPERADMIN)) {
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

    // ── DTOs ─────────────────────────────────────────────────────────────────

    record AdminCreateRequest(String adminName, String emailId, String phoneNumber,
                               String password, String role) {}

    record AdminUpdateRequest(String adminName, String phoneNumber,
                               String notifications, String password, Boolean isActive) {}

    record AdminResponse(Long id, String adminName, String emailId, String phoneNumber,
                         String role, String notifications, boolean isActive,
                         Instant createdAt, Instant updatedAt) {
        static AdminResponse from(Admin a) {
            return new AdminResponse(
                    a.getId(), a.getAdminName(), a.getEmailId(), a.getPhoneNumber(),
                    a.getRole().name(), a.getNotifications().name(),
                    Boolean.TRUE.equals(a.getIsActive()),
                    a.getCreatedAt(), a.getUpdatedAt());
        }
    }
}
