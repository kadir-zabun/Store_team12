package org.example.onlinestorebackend.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

@RestControllerAdvice(basePackages = "org.example.onlinestorebackend")
public class RestResponseAdvice implements ResponseBodyAdvice<Object> {

    private final HttpServletRequest request;
    public RestResponseAdvice(HttpServletRequest request) { this.request = request; }

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body,
                                  MethodParameter returnType,
                                  MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  org.springframework.http.server.ServerHttpRequest req,
                                  org.springframework.http.server.ServerHttpResponse res) {

        // PDF veya binary response'ları atla (byte array)
        if (body instanceof byte[] || 
            (selectedContentType != null && selectedContentType.equals(MediaType.APPLICATION_PDF))) {
            return body; // PDF response'ları olduğu gibi döndür
        }

        // ResponseEntity<byte[]> kontrolü
        if (body instanceof ResponseEntity<?> re) {
            Object inner = re.getBody();
            // Eğer içeride byte array varsa (PDF), olduğu gibi döndür
            if (inner instanceof byte[]) {
                return re;
            }
            // Content-Type PDF ise olduğu gibi döndür
            if (re.getHeaders().getContentType() != null && 
                re.getHeaders().getContentType().equals(MediaType.APPLICATION_PDF)) {
                return re;
            }
        }

        // 1) Zaten sarılıysa dokunma
        if (body instanceof ApiResponse<?> || body instanceof org.springframework.http.ProblemDetail) return body;

        // 2) ResponseEntity ise: içteki body'yi sar, status/res headers kalsın
        if (body instanceof ResponseEntity<?> re) {
            Object inner = re.getBody();
            if (inner instanceof ApiResponse<?>) return re; // zaten sarılı
            ApiResponse.Meta m = baseMeta();
            return ResponseEntity.status(re.getStatusCode()).headers(re.getHeaders())
                    .body(ApiResponse.ok(inner, m));
        }

        if (body instanceof String s) {
            return s;
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
