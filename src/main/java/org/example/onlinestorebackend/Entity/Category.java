package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "categories")
public class Category {

    @Id
    private String categoryId;

    @Indexed(unique = true)            // kategori adına göre aramayı hızlandırır ve benzersiz kılar
    private String categoryName;

    private String description;
}
