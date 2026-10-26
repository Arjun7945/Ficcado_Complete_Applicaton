package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.dto.AdminDto.AdminCreateRequest;
import com.aps.ficcado_crm_backend.dto.AdminDto.AdminUpdateRequest;
import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.entity.enums.NotificationSetting;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.AuthService;
import com.aps.ficcado_crm_backend.service.ProfitabilityService;
import com.aps.ficcado_crm_backend.service.ProfitabilityService.ProfitabilityResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verification of P2-1A admin permissions:
 * - Freshly created ADMIN can call all admin-panel endpoints and reports profitability endpoint.
 * - WAREHOUSE_HANDLER (or unprivileged user) is denied everywhere.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminPermissionsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private ActivityLogService activityLogService;

    @MockBean
    private ProfitabilityService profitabilityService;

    private Admin adminUser;
    private Admin superadminUser;
    private UsernamePasswordAuthenticationToken adminAuth;
    private UsernamePasswordAuthenticationToken warehouseAuth;

    @BeforeEach
    void setUp() {
        adminUser = Admin.builder()
                .id(20L)
                .adminName("Standard Admin")
                .emailId("admin@ficcado.com")
                .phoneNumber("9876543210")
                .role(AdminRole.ADMIN)
                .notifications(NotificationSetting.ENABLED)
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        superadminUser = Admin.builder()
                .id(1L)
                .adminName("Super Admin")
                .emailId("superadmin@ficcado.com")
                .phoneNumber("9876543211")
                .role(AdminRole.SUPERADMIN)
                .notifications(NotificationSetting.ENABLED)
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        adminAuth = new UsernamePasswordAuthenticationToken(
                adminUser,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        Admin warehouseUser = Admin.builder()
                .id(30L)
                .adminName("Warehouse Handler")
                .emailId("warehouse@ficcado.com")
                .role(AdminRole.ADMIN)
                .isActive(true)
                .build();

        warehouseAuth = new UsernamePasswordAuthenticationToken(
                warehouseUser,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_WAREHOUSE_HANDLER"))
        );

        when(authService.hasRole(adminUser, AdminRole.ADMIN)).thenReturn(true);
        when(authService.hasRole(adminUser, AdminRole.SUPERADMIN)).thenReturn(false);
        when(authService.hasRole(superadminUser, AdminRole.SUPERADMIN)).thenReturn(true);
        when(authService.hasRole(superadminUser, AdminRole.ADMIN)).thenReturn(false);
    }

    @Test
    @DisplayName("ADMIN role can call GET /api/admins (200)")
    void admin_canGetAllAdmins() throws Exception {
        when(authService.getAllAdmins()).thenReturn(List.of(adminUser, superadminUser));

        mockMvc.perform(get("/api/admins")
                        .with(authentication(adminAuth)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN role can call GET /api/admins/{id} (200)")
    void admin_canGetAdminById() throws Exception {
        when(authService.findAdminById(1L)).thenReturn(Optional.of(superadminUser));

        mockMvc.perform(get("/api/admins/1")
                        .with(authentication(adminAuth)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN role can call POST /api/admins (201)")
    void admin_canCreateAdmin() throws Exception {
        Admin created = Admin.builder()
                .id(25L)
                .adminName("New Assistant")
                .emailId("assistant@ficcado.com")
                .phoneNumber("9998887776")
                .role(AdminRole.ADMIN)
                .notifications(NotificationSetting.ENABLED)
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        when(authService.createAdmin(any(), eq(adminUser))).thenReturn(created);

        AdminCreateRequest request = new AdminCreateRequest(
                "New Assistant",
                "assistant@ficcado.com",
                "9998887776",
                "Password123!",
                "ADMIN"
        );

        mockMvc.perform(post("/api/admins")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("ADMIN role can call PUT /api/admins/{id} (200)")
    void admin_canUpdateAdmin() throws Exception {
        when(authService.findAdminById(1L)).thenReturn(Optional.of(superadminUser));
        when(authService.updateAdmin(any(), eq(adminUser))).thenReturn(superadminUser);

        AdminUpdateRequest request = new AdminUpdateRequest(
                "Super Admin Updated",
                "9876543211",
                "ENABLED",
                null,
                true
        );

        mockMvc.perform(put("/api/admins/1")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN role can call PATCH /api/admins/{id}/deactivate (204)")
    void admin_canDeactivateAdmin() throws Exception {
        Admin target = Admin.builder()
                .id(40L)
                .adminName("Old Admin")
                .emailId("old@ficcado.com")
                .role(AdminRole.ADMIN)
                .isActive(true)
                .build();

        when(authService.findAdminById(40L)).thenReturn(Optional.of(target));
        when(authService.updateAdmin(any(), eq(adminUser))).thenReturn(target);

        mockMvc.perform(patch("/api/admins/40/deactivate")
                        .with(authentication(adminAuth)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("ADMIN role can call GET /api/reports/profitability (200)")
    void admin_canGetProfitabilityReport() throws Exception {
        ProfitabilityResult result = ProfitabilityResult.builder()
                .grossRevenue(BigDecimal.valueOf(10000))
                .netRevenue(BigDecimal.valueOf(9500))
                .cogs(BigDecimal.valueOf(4000))
                .grossProfit(BigDecimal.valueOf(5500))
                .operationalExpenses(BigDecimal.valueOf(1000))
                .vendorPayments(BigDecimal.valueOf(1500))
                .totalExpenses(BigDecimal.valueOf(2500))
                .netProfit(BigDecimal.valueOf(3000))
                .discountsProvided(BigDecimal.valueOf(500))
                .unpaidDues(BigDecimal.valueOf(1000))
                .totalRefunded(BigDecimal.ZERO)
                .build();

        when(profitabilityService.calculate(any(), any(), any(), any())).thenReturn(result);

        mockMvc.perform(get("/api/reports/profitability")
                        .with(authentication(adminAuth)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("WAREHOUSE_HANDLER is denied access to admin-panel endpoints (403)")
    void warehouseHandler_isDeniedAdminPanelEndpoints() throws Exception {
        mockMvc.perform(get("/api/admins")
                        .with(authentication(warehouseAuth)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admins")
                        .with(authentication(warehouseAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adminName\":\"Test\",\"emailId\":\"t@f.com\",\"phoneNumber\":\"1234567890\",\"password\":\"Pass123!\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/reports/profitability")
                        .with(authentication(warehouseAuth)))
                .andExpect(status().isForbidden());
    }
}
