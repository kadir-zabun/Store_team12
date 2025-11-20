package org.example.onlinestorebackend.Entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "product_category_relations")
@CompoundIndex(name = "product_category_unique", def = "{'productId': 1, 'categoryId': 1}", unique = true)
public class ProductCategoryRelation {

    @Id
    private String relationId;

    @Indexed
    private String productId;

    @Indexed
    private String categoryId;

    private Instant createdAt;
}

