package com.aps.ficcado_crm_backend;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PublicDeliveryTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/public/delivery-options returns active configured courier options")
    void getDeliveryOptions_returnsActiveOptions() throws Exception {
        mockMvc.perform(get("/api/public/delivery-options")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value("del-standard"))
                .andExpect(jsonPath("$[0].rate").value(0))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[1].id").value("del-priority"))
                .andExpect(jsonPath("$[1].rate").value(99))
                .andExpect(jsonPath("$[1].status").value("ACTIVE"));
    }
}
