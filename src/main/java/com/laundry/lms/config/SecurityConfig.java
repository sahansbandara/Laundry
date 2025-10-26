package com.laundry.lms.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 🔓 Disable CSRF (for simple JSON-based APIs)
                .csrf(csrf -> csrf
                        .ignoringRequestMatchers(
                                new AntPathRequestMatcher("/api/**"),
                                new AntPathRequestMatcher("/h2-console/**")
                        )
                )

                // ✅ Permit all frontend and essential API endpoints
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/frontend/**",      // all your HTML/JS files
                                "/api/orders/**",    // order create/list/get
                                "/api/payments/**",  // payment + COD + demo checkout
                                "/api/auth/**",      // login/register APIs
                                "/api/catalog/**",   // service catalog
                                "/h2-console/**"     // embedded DB console
                        ).permitAll()
                        .anyRequest().permitAll()
                )

                // ⚙️ Allow H2 Console to display properly
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))

                // 🧠 Use basic auth (optional; you can later switch to JWT or form login)
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
