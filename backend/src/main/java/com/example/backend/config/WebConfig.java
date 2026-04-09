package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.path}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Получаем абсолютный путь к папке uploads
        String absolutePath = Paths.get(uploadPath).toAbsolutePath().toUri().toString();
        
        // Мапим URL /uploads/** на физическую папку
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(absolutePath);
    }
}