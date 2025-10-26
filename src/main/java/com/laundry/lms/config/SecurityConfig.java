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
      .cors(Customizer.withDefaults())
      .csrf(csrf -> csrf
        .ignoringRequestMatchers(
          new AntPathRequestMatcher("/api/**"),
          new AntPathRequestMatcher("/h2-console/**")
        )
      )
      .authorizeHttpRequests(auth -> auth
        .requestMatchers(
          "/frontend/**", "/api/orders/**", "/api/payments/**",
          "/api/auth/**", "/api/catalog/**", "/h2-console/**",
          "/swagger-ui/**", "/v3/api-docs/**"
        ).permitAll()
        .anyRequest().permitAll()
      )
      .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
      .httpBasic(Customizer.withDefaults());
    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}
