package com.aps.ficcado_crm_backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiExporterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void exportOpenApiSpec() throws Exception {
        MvcResult result = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn();

        String rawJson = result.getResponse().getContentAsString();
        assertThat(rawJson).isNotEmpty();

        // Pretty print the JSON
        Object jsonObject = objectMapper.readValue(rawJson, Object.class);
        String prettyJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonObject);

        // Target 1: crm/docs/openapi.json
        Path crmDocsPath = Paths.get("../../docs/openapi.json").toAbsolutePath().normalize();
        Files.createDirectories(crmDocsPath.getParent());
        Files.writeString(crmDocsPath, prettyJson);
        System.out.println("Exported OpenAPI spec to: " + crmDocsPath);

        assertThat(Files.exists(crmDocsPath)).isTrue();
    }
}
