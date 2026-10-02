package com.aps.ficcado_crm_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Authoritative OpenAPI 3 configuration for Ficcado CRM.
 * Exposes full schema definition at /v3/api-docs and interactive Swagger UI at /swagger-ui.html.
 * Configures Cookie and Bearer JWT authentication schemes and multi-environment servers.
 */
@Configuration
public class OpenApiConfig {

    @Value("${server.port:8081}")
    private String serverPort;

    @Bean
    public OpenAPI ficcadoOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ficcado CRM & Inventory Management API")
                        .description("Authoritative OpenAPI 3 Specification for Ficcado CRM. Governs sales lifecycle, inventory deduction, warehouse allocation, customer relationship management, audit logs, and product reviews.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Ficcado Engineering")
                                .email("dev@ficcado.com")
                                .url("https://crm.ficcado.com"))
                        .license(new License().name("Proprietary")))
                .servers(List.of(
                        new Server().url("http://localhost:" + serverPort).description("Local Development Server"),
                        new Server().url("https://crm.ficcado.com").description("Production Environment")
                ))
                .components(new Components()
                        .addSecuritySchemes("cookieAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.COOKIE)
                                .name("ficcado_session")
                                .description("Session JWT transmitted via httpOnly cookie 'ficcado_session'"))
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT Token for Authorization header (Bearer <token>)")))
                .addSecurityItem(new SecurityRequirement().addList("cookieAuth").addList("bearerAuth"));
    }
}
