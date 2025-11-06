package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;


@Data
@Document(collection = "invoices")
public class Invoice{

    @Id
    private String invoiceId;

    private String orderId;

    private LocalDateTime invoiceDate;

    private String pdfUrl;

}



