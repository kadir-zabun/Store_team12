package org.example.onlinestorebackend.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "User")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String userId;

    @Indexed                 // isme göre aramayı hızlandırır
    private String name;

    @Indexed(unique = true)  // Mongo’da tekil index
    private String username;

    @JsonIgnore              // API’lerde asla dönme
    private String password;

    @Indexed                 // e-posta ile arama için index
    private String email;

    /**
     * Vergi kimlik numarası (zorunlu alan).
     */
    private String taxId;

    /**
     * Müşterinin teslimat/ev adresi (zorunlu alan).
     */
    private String homeAddress;

    private List<String> orderNo = new ArrayList<>();

    /**
     * Kullanıcı rolü:
     * - CUSTOMER: normal müşteri
     * - PRODUCT_MANAGER: ürün/kategori/stok/delivery yöneten kullanıcı
     * - SALES_MANAGER: fiyat/indirim/fatura/rapor yöneten kullanıcı
     * - SUPPORT_AGENT: canlı destek temsilcisi
     */
    private String role = "CUSTOMER";

    private String cardNumber;
    private String cardHolderName;
    private String expiryDate;
}