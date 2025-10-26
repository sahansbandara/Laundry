package com.laundry.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LaundryManagementSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(LaundryManagementSystemApplication.class, args);
    }
}
