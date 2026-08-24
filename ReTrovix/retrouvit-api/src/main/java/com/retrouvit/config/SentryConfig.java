package com.retrouvit.config;

import io.sentry.spring.jakarta.tracing.SentryTracingFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import org.springframework.web.filter.OncePerRequestFilter;

import io.sentry.Sentry;

import jakarta.annotation.PostConstruct;

@Configuration
@Slf4j
@ConditionalOnProperty(name = "sentry.dsn")
public class SentryConfig {

    @Value("${sentry.dsn:}")
    private String sentryDsn;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @PostConstruct
    public void initSentry() {
        if (sentryDsn == null || sentryDsn.isBlank()) {
            log.info("Sentry DSN not configured — error tracking disabled");
            return;
        }

        Sentry.init(options -> {
            options.setDsn(sentryDsn);
            options.setEnvironment(activeProfile);
            options.setRelease("retrouvit-api@1.0.0");
            options.setTracesSampleRate(0.1); // 10% of transactions

            // Don't send PII
            options.setSendDefaultPii(false);

            // Before send callback — filter sensitive data
            options.setBeforeSend((event, hint) -> {
                // Remove sensitive headers
                if (event.getRequest() != null) {
                    var headers = event.getRequest().getHeaders();
                    if (headers != null) {
                        headers.remove("Authorization");
                        headers.remove("Cookie");
                    }
                }
                return event;
            });

            log.info("Sentry initialized for environment: {}", activeProfile);
        });
    }

    @Bean
    public FilterRegistrationBean<SentryTracingFilter> sentryTracingFilter() {
        FilterRegistrationBean<SentryTracingFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new SentryTracingFilter());
        registration.addUrlPatterns("/api/*");
        registration.setName("SentryTracingFilter");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
