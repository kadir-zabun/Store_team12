package org.example.onlinestorebackend.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.ByteArrayHttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

@RestControllerAdvice(basePackages = "org.example.onlinestorebackend")
public class RestResponseAdvice implements ResponseBodyAdvice<Object> {

    private final HttpServletRequest request;

    public RestResponseAdvice(HttpServletRequest request) {
        this.request = request;
    }

    @Override
    public boolean supports(MethodParameter returnType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  org.springframework.http.server.ServerHttpRequest req,
                                  org.springframework.http.server.ServerHttpResponse res) {

        // 0) PDF endpoint'lerini tamamen bypass et (en garanti)
        String path = request.getRequestURI();
        if (path != null && path.startsWith("/api/payment/invoice/")) {
            return body;
        }

        // 1) Byte array converter seçildiyse wrap etme
        if (selectedConverterType != null &&
                ByteArrayHttpMessageConverter.class.isAssignableFrom(selectedConverterType)) {
            return body;
        }

        // 2) Content-Type PDF ise wrap etme (equals yerine includes)
        if (selectedContentType != null && MediaType.APPLICATION_PDF.includes(selectedContentType)) {
            return body;
        }

        // 3) Body byte[] ise wrap etme
        if (body instanceof byte[]) {
            return body;
        }

        // 4) ResponseEntity içindeki PDF/byte[] ise wrap etme
        if (body instanceof ResponseEntity<?> re) {
            Object inner = re.getBody();
            MediaType ct = re.getHeaders().getContentType();

            if (inner instanceof byte[]) {
                return re;
            }
            if (ct != null && MediaType.APPLICATION_PDF.includes(ct)) {
                return re;
            }
        }

        // 5) Zaten sarılıysa dokunma
        if (body instanceof ApiResponse<?> || body instanceof org.springframework.http.ProblemDetail) {
            return body;
        }

        // 6) ResponseEntity ise: iç body'yi sar, status/headers koru
        if (body instanceof ResponseEntity<?> re) {
            Object inner = re.getBody();
            if (inner instanceof ApiResponse<?>) return re;

            ApiResponse.Meta m = baseMeta();
            return ResponseEntity.status(re.getStatusCode())
                    .headers(re.getHeaders())
                    .body(ApiResponse.ok(inner, m));
        }

        // 7) String ise elleme (String converter ile JSON wrapper çakışmasın)
        if (body instanceof String) {
            return body;
        }

        ApiResponse.Meta m = baseMeta();
        return ApiResponse.ok(body, m);
    }

    private ApiResponse.Meta baseMeta() {
        ApiResponse.Meta m = new ApiResponse.Meta();
        m.requestId = (String) request.getAttribute("X-Request-Id");
        m.timestamp = OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return m;
    }
}
