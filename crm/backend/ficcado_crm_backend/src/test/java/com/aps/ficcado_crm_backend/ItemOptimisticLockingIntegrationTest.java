package com.aps.ficcado_crm_backend;

import com.aps.ficcado_crm_backend.entity.Admin;
import com.aps.ficcado_crm_backend.entity.Item;
import com.aps.ficcado_crm_backend.entity.enums.AdminRole;
import com.aps.ficcado_crm_backend.entity.enums.ItemStatus;
import com.aps.ficcado_crm_backend.exception.ItemVersionConflictException;
import com.aps.ficcado_crm_backend.repository.AdminRepository;
import com.aps.ficcado_crm_backend.repository.ItemRepository;
import com.aps.ficcado_crm_backend.service.ItemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class ItemOptimisticLockingIntegrationTest {

    @Autowired
    private ItemService itemService;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private AdminRepository adminRepository;

    private Admin testAdmin;

    @BeforeEach
    void setUp() {
        testAdmin = adminRepository.findByEmailId("admin@ficcado.com")
                .orElseGet(() -> adminRepository.save(Admin.builder()
                        .adminName("Test Superadmin")
                        .emailId("admin@ficcado.com")
                        .passwordHash("$2a$10$ecOmlKKAMHPmImwe/hl/YuTP4k..3jN2UW4Yp1RRItvHwVcw4odG2")
                        .role(AdminRole.SUPERADMIN)
                        .isActive(true)
                        .build()));
    }

    @Test
    @DisplayName("P4C-1: Same admin saving item twice sequentially succeeds with +1 version bump each time")
    void twoSequentialUpdates_succeedWithoutReload() {
        // 1. Create item
        Item created = itemService.createItem(
                "TEST-SEQ-TEE",
                "T-Shirt",
                new BigDecimal("500.00"),
                new BigDecimal("200.00"),
                List.of("M", "L"),
                ItemStatus.ACTIVE,
                "Sequential update test item",
                List.of("#000000", "#FFFFFF"),
                List.of("cotton", "vintage"),
                testAdmin
        );

        assertThat(created.getId()).isNotNull();
        assertThat(created.getVersion()).isEqualTo(0L);

        // 2. First update: change price, retain colors
        Item updated1 = itemService.updateItem(
                created.getId(),
                "TEST-SEQ-TEE",
                "T-Shirt",
                new BigDecimal("599.00"),
                new BigDecimal("200.00"),
                List.of("M", "L"),
                ItemStatus.ACTIVE,
                "Sequential update test item - v1",
                List.of("#000000", "#FFFFFF"),
                List.of("cotton", "vintage"),
                created.getVersion(),
                testAdmin
        ).orElseThrow();

        assertThat(updated1.getVersion()).isEqualTo(1L);

        // Verify DB row matches
        Item inDb1 = itemRepository.findById(created.getId()).orElseThrow();
        assertThat(inDb1.getVersion()).isEqualTo(1L);

        // 3. Second update: immediate sequential update with new version, no reload
        Item updated2 = itemService.updateItem(
                created.getId(),
                "TEST-SEQ-TEE-RENAMED",
                "T-Shirt",
                new BigDecimal("699.00"),
                new BigDecimal("250.00"),
                List.of("S", "M", "L"),
                ItemStatus.ACTIVE,
                "Sequential update test item - v2",
                List.of("#000000", "#1A2B3C"),
                List.of("cotton", "new-tag"),
                updated1.getVersion(),
                testAdmin
        ).orElseThrow();

        assertThat(updated2.getVersion()).isEqualTo(2L);
        assertThat(updated2.getItemName()).isEqualTo("TEST-SEQ-TEE-RENAMED");

        Item inDb2 = itemRepository.findById(created.getId()).orElseThrow();
        assertThat(inDb2.getVersion()).isEqualTo(2L);
    }

    @Test
    @DisplayName("P4C-1: Stale version in update throws ItemVersionConflictException")
    void staleVersionUpdate_throwsConflict() {
        Item created = itemService.createItem(
                "TEST-STALE-LOCK",
                "Hoodie",
                new BigDecimal("1200.00"),
                new BigDecimal("600.00"),
                List.of("L"),
                ItemStatus.ACTIVE,
                "Stale lock test",
                List.of("#000000"),
                List.of("warm"),
                testAdmin
        );

        // Admin A updates to version 1
        Item v1 = itemService.updateItem(
                created.getId(),
                "TEST-STALE-LOCK",
                "Hoodie",
                new BigDecimal("1300.00"),
                new BigDecimal("600.00"),
                List.of("L"),
                ItemStatus.ACTIVE,
                "Admin A edit",
                List.of("#000000"),
                List.of("warm"),
                created.getVersion(),
                testAdmin
        ).orElseThrow();

        assertThat(v1.getVersion()).isEqualTo(1L);

        // Admin B attempts update with stale version 0
        assertThatThrownBy(() -> itemService.updateItem(
                created.getId(),
                "TEST-STALE-LOCK-B",
                "Hoodie",
                new BigDecimal("1400.00"),
                new BigDecimal("600.00"),
                List.of("L"),
                ItemStatus.ACTIVE,
                "Admin B edit",
                List.of("#000000"),
                List.of("warm"),
                0L, // Stale!
                testAdmin
        )).isInstanceOf(ItemVersionConflictException.class);
    }
}
