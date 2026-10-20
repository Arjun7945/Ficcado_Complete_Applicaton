package com.aps.ficcado_website_data;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class FiccadoWebsiteDataApplication {

    public static void main(String[] args) {
        SpringApplication.run(FiccadoWebsiteDataApplication.class, args);
    }
}
