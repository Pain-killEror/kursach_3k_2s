package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Префиксы для отправки сообщений КЛИЕНТАМ (на фронт)
        config.enableSimpleBroker("/topic");
        // Префикс для получения сообщений ОТ КЛИЕНТОВ
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Эндпоинт, к которому будет подключаться React
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Разрешаем CORS
                .withSockJS(); // Fallback на случай блокировки чистых сокетов
    }
}