package com.example.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;

    public JwtFilter(JwtUtils jwtUtils) {
        this.jwtUtils = jwtUtils;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. Достаем заголовок Authorization из запроса
        String authHeader = request.getHeader("Authorization");

        // 2. Проверяем, есть ли в нем токен и начинается ли он с "Bearer "
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7); // Отрезаем слово "Bearer "

            // 3. Если токен валидный, авторизуем пользователя в Spring Security
            if (jwtUtils.validateToken(token)) {
                String email = jwtUtils.getEmailFromToken(token);
                
                // Создаем объект авторизации (пока без ролей, просто пустой список)
                UsernamePasswordAuthenticationToken authToken = 
                        new UsernamePasswordAuthenticationToken(email, null, new ArrayList<>());
                
                // Сообщаем Spring Security: "Этот парень свой, пропускай"
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // Передаем запрос дальше по цепочке
        filterChain.doFilter(request, response);
    }
}