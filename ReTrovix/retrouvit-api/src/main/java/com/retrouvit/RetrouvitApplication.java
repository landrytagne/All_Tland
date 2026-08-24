package com.retrouvit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RetrouvitApplication {

    public static void main(String[] args) {
        SpringApplication.run(RetrouvitApplication.class, args);
    }
}
