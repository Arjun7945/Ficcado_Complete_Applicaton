package com.aps.ficcado_crm_backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Reflection-based test required by Part2.md (Phase P2-1A).
 * Scans every controller class and method in com.aps.ficcado_crm_backend.controller.
 * Fails if any @PreAuthorize annotation allows SUPERADMIN without also allowing ADMIN.
 */
class AdminRoleReflectionTest {

    @Test
    @DisplayName("Reflection scan: No controller class or method allows SUPERADMIN without allowing ADMIN")
    void verifyAllControllersAllowAdminWhereverSuperadminIsAllowed() throws Exception {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        List<String> violations = new ArrayList<>();

        for (var bd : scanner.findCandidateComponents("com.aps.ficcado_crm_backend.controller")) {
            Class<?> clazz = Class.forName(bd.getBeanClassName());

            // Check class-level @PreAuthorize
            PreAuthorize classPreAuth = clazz.getAnnotation(PreAuthorize.class);
            if (classPreAuth != null) {
                checkExpression(clazz.getSimpleName(), "(class-level)", classPreAuth.value(), violations);
            }

            // Check method-level @PreAuthorize
            for (Method method : clazz.getDeclaredMethods()) {
                PreAuthorize methodPreAuth = method.getAnnotation(PreAuthorize.class);
                if (methodPreAuth != null) {
                    checkExpression(clazz.getSimpleName(), method.getName(), methodPreAuth.value(), violations);
                }
            }
        }

        assertTrue(violations.isEmpty(),
                "Found authorization expressions that allow SUPERADMIN but do NOT allow ADMIN:\n" +
                        String.join("\n", violations));
    }

    private void checkExpression(String className, String targetName, String expr, List<String> violations) {
        if (expr != null && expr.contains("SUPERADMIN")) {
            if (!expr.contains("ADMIN") || expr.matches(".*hasRole\\(['\"]SUPERADMIN['\"]\\).*")) {
                // If it mentions SUPERADMIN but not ADMIN, or has individual hasRole('SUPERADMIN')
                violations.add(String.format("[%s#%s] Expression: %s", className, targetName, expr));
            }
        }
    }
}
