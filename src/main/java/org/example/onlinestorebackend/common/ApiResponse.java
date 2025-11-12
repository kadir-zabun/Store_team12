package org.example.onlinestorebackend.common;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    public boolean success;
    public T data;
    public Error error;
    public Meta meta;

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.success = true;
        r.data = data;
        return r;
    }
    public static <T> ApiResponse<T> ok(T data, Meta meta) {
        ApiResponse<T> r = ok(data);
        r.meta = meta;
        return r;
    }
    public static <T> ApiResponse<T> fail(String code, String message, Object details, String requestId) {
        ApiResponse<T> r = new ApiResponse<>();
        r.success = false;
        r.error = new Error(code, message, details, requestId);
        return r;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Meta {
        public Integer page;
        public Integer size;
        public Long totalElements;
        public Integer totalPages;
        public String requestId;
        public String timestamp;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Error {
        public String code;
        public String message;
        public Object details;
        public String requestId;
        public Error(String code, String message, Object details, String requestId) {
            this.code = code; this.message = message; this.details = details; this.requestId = requestId;
        }
    }
}
