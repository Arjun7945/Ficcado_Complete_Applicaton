package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.service.ActivityLogService;
import com.aps.ficcado_crm_backend.service.AuthService;
import com.aps.ficcado_crm_backend.service.ProfitabilityService;
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

import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Diagnostic test reproducing the exact cause of "Access Denied" for an ADMIN role
 * attempting to access admin-panel endpoints and reports before P2-1A fix.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminPermissionsDiagnosisTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private ActivityLogService activityLogService;

    @MockBean
    private ProfitabilityService profitabilityService;

    private UsernamePasswordAuthenticationToken createAdminAuth(Long id, String email, AdminRole role) {
        Admin admin = Admin.builder()
                .id(id)
                .adminName("New Admin")
                .emailId(email)
                .role(role)
                .isActive(true)
                .build();
        return new UsernamePasswordAuthenticationToken(
                admin,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
    }

    @Test
    @DisplayName("Diagnose: New ADMIN accessing GET /api/admins produces 403 Forbidden")
    void diagnose_adminAccessToGetAllAdmins_isDenied() throws Exception {
        var adminAuth = createAdminAuth(2L, "newadmin@ficcado.com", AdminRole.ADMIN);

        mockMvc.perform(get("/api/admins")
                        .with(authentication(adminAuth)))
                .andDo(result -> {
                    System.out.println("DIAGNOSTIC - GET /api/admins Status: " + result.getResponse().getStatus());
                    System.out.println("DIAGNOSTIC - Error Message: " + result.getResponse().getErrorMessage());
                    if (result.getResolvedException() != null) {
                        System.out.println("DIAGNOSTIC - Exception: " + result.getResolvedException().getClass().getName()
                                + ": " + result.getResolvedException().getMessage());
                    }
                });
    }

    @Test
    @DisplayName("Diagnose: New ADMIN accessing GET /api/reports/profitability produces 403 Forbidden")
    void diagnose_adminAccessToProfitability_isDenied() throws Exception {
        var adminAuth = createAdminAuth(2L, "newadmin@ficcado.com", AdminRole.ADMIN);

        mockMvc.perform(get("/api/reports/profitability")
                        .with(authentication(adminAuth)))
                .andDo(result -> {
                    System.out.println("DIAGNOSTIC - GET /api/reports/profitability Status: " + result.getResponse().getStatus());
                    System.out.println("DIAGNOSTIC - Error Message: " + result.getResponse().getErrorMessage());
                    if (result.getResolvedException() != null) {
                        System.out.println("DIAGNOSTIC - Exception: " + result.getResolvedException().getClass().getName()
                                + ": " + result.getResolvedException().getMessage());
                    }
                });
    }
}
