package com.aps.ficcado_crm_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // Required for @Scheduled in AuthService.pruneExpiredRevokedTokens()
public class FiccadoCrmBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FiccadoCrmBackendApplication.class, args);
	}

}
