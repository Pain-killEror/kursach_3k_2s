package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Отключаем CSRF (обязательно для Stateless API с JWT)
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Включаем CORS с нашей конфигурацией
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 3. Устанавливаем Stateless сессии (сервер не хранит состояние, работаем по токенам)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 4. Настройка правил доступа
            .authorizeHttpRequests(auth -> auth
                // Разрешаем все OPTIONS запросы (необходимы браузеру перед POST запросом)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                
                // Публичные эндпоинты
                .requestMatchers("/api/auth/**", "/uploads/**", "/ws/**", "/error").permitAll() 
                
                // Просмотр объектов доступен всем (GET запросы на /api/objects и /api/objects/...)
                .requestMatchers(HttpMethod.GET, "/api/objects/**").permitAll() 
                
                // Портфель и транзакции - только для авторизованных
                .requestMatchers("/api/portfolio/**").authenticated()
                
                // Админка
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // Все остальные запросы должны быть подтверждены JWT токеном
                .anyRequest().authenticated()
            )
            
            // 5. Добавляем фильтр проверки JWT перед стандартным фильтром аутентификации
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Разрешаем фронтенд (убедись, что порт 5173 верный)
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        
        // Явно разрешаем все основные HTTP методы
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        // Явно разрешаем заголовок Authorization (критично для JWT!)
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        
        // Разрешаем отправку Credentials (куки, заголовки авторизации)
        config.setAllowCredentials(true);
        
        // Кэшируем предварительные (OPTIONS) запросы на 1 час
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}