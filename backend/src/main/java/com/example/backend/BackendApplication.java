package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.cache.annotation.EnableCaching;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.connection.RedisConnectionFactory;

@SpringBootApplication
@EnableScheduling
@EnableCaching
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public CommandLineRunner clearRedisCache(RedisConnectionFactory connectionFactory) {
        return args -> {
            System.out.println(">>> Clearing Redis cache...");
            connectionFactory.getConnection().flushAll();
            System.out.println(">>> Redis cache cleared successfully.");
        };
    }

}
