package com.aps.ficcado_inventory_sales_management_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // Required for @Scheduled in AuthService.pruneExpiredRevokedTokens()
public class FiccadoInventorySalesManagementAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(FiccadoInventorySalesManagementAppApplication.class, args);
	}

}
