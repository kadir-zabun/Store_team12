package org.example.onlinestorebackend.common;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Component
public class RequestIdFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        String reqId = UUID.randomUUID().toString();
        String ts = OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        req.setAttribute("X-Request-Id", reqId);
        req.setAttribute("X-Timestamp", ts);
        MDC.put("requestId", reqId);

        ((HttpServletResponse) res).setHeader("X-Request-Id", reqId);

        try { chain.doFilter(req, res); }
        finally { MDC.clear(); }
    }
}
