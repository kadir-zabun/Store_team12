package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalesMetricsResponse {

    private BigDecimal totalRevenue = BigDecimal.ZERO;
    private BigDecimal totalCost = BigDecimal.ZERO;
    private BigDecimal totalProfit = BigDecimal.ZERO;

    private List<Point> points = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Point {
        private LocalDate date;
        private BigDecimal revenue;
        private BigDecimal cost;
        private BigDecimal profit;
    }
}


