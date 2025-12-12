package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.example.onlinestorebackend.Dto.PaymentRequestDto;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final ProductRepository productRepository;

    /**
     * Metni belirli bir genişliğe göre birden fazla satıra böler
     */
    private List<String> wrapText(String text, float maxWidth, PDType1Font font, float fontSize) throws IOException {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return lines;
        }

        String[] words = text.split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            // Tek kelimenin genişliğini kontrol et
            float wordWidth = font.getStringWidth(word) / 1000.0f * fontSize;
            
            // Eğer tek kelime maxWidth'den büyükse, kelimeyi karakter karakter böl
            if (wordWidth > maxWidth) {
                // Mevcut satırı ekle (varsa)
                if (currentLine.length() > 0) {
                    lines.add(currentLine.toString());
                    currentLine = new StringBuilder();
                }
                
                // Uzun kelimeyi karakter karakter böl
                for (char c : word.toCharArray()) {
                    String testChar = currentLine.toString() + c;
                    float charWidth = font.getStringWidth(testChar) / 1000.0f * fontSize;
                    
                    if (charWidth > maxWidth && currentLine.length() > 0) {
                        lines.add(currentLine.toString());
                        currentLine = new StringBuilder(String.valueOf(c));
                    } else {
                        currentLine.append(c);
                    }
                }
            } else {
                // Normal kelime işleme
                String testLine = currentLine.length() > 0 
                    ? currentLine.toString() + " " + word 
                    : word;
                
                // Metnin genişliğini hesapla
                float textWidth = font.getStringWidth(testLine) / 1000.0f * fontSize;
                
                if (textWidth > maxWidth && currentLine.length() > 0) {
                    // Mevcut satırı ekle ve yeni satıra başla
                    lines.add(currentLine.toString());
                    currentLine = new StringBuilder(word);
                } else {
                    // Kelimeyi mevcut satıra ekle
                    currentLine = new StringBuilder(testLine);
                }
            }
        }
        
        // Son satırı ekle
        if (currentLine.length() > 0) {
            lines.add(currentLine.toString());
        }
        
        return lines;
    }

    public byte[] generateInvoicePdf(String invoiceId,
                                     Order order,
                                     User user,
                                     BigDecimal totalAmount,
                                     LocalDateTime invoiceDate,
                                     PaymentRequestDto.ItemDto[] items) throws IOException {

        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float margin = 50;
                float yPosition = 750;
                float lineHeight = 20;

                // Başlık
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("INVOICE");
                contentStream.endText();

                yPosition -= 40;

                // Invoice info
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Invoice ID: " + invoiceId);
                contentStream.endText();

                yPosition -= lineHeight;

                String dateStr = invoiceDate != null
                        ? invoiceDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        : "-";

                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Date: " + dateStr);
                contentStream.endText();

                if (order != null) {
                    yPosition -= lineHeight;
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText("Order ID: " + order.getOrderId());
                    contentStream.endText();
                }

                yPosition -= 30;

                // Bill To
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Bill To:");
                contentStream.endText();

                yPosition -= lineHeight;
                contentStream.setFont(PDType1Font.HELVETICA, 10);

                if (user != null) {
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText(user.getName() != null ? user.getName() : user.getUsername());
                    contentStream.endText();

                    yPosition -= lineHeight;

                    if (user.getEmail() != null) {
                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, yPosition);
                        contentStream.showText(user.getEmail());
                        contentStream.endText();
                        yPosition -= lineHeight;
                    }
                }

                yPosition -= 20;

                // Items başlık
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Items:");
                contentStream.endText();

                yPosition -= lineHeight;
                float currentY = yPosition;
                contentStream.setFont(PDType1Font.HELVETICA, 10);
                float fontSize = 10;
                float maxTextWidth = 450; // Sayfa genişliği - margin'ler (yaklaşık 500 - 50)

                // 1) PaymentRequestDto içinden item geldiyse onları yaz
                if (items != null && items.length > 0) {
                    for (int i = 0; i < items.length; i++) {
                        PaymentRequestDto.ItemDto item = items[i];
                        
                        if (currentY < 100) {
                            break; // sayfa sonuna geldik
                        }

                        String itemName = "Product " + item.getProductId();
                        Product product = productRepository.findById(item.getProductId()).orElse(null);
                        if (product != null && product.getProductName() != null) {
                            itemName = product.getProductName();
                        }

                        String qty = String.valueOf(item.getQuantity() != null ? item.getQuantity() : 0);
                        BigDecimal priceVal = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                        String price = "$" + priceVal.toPlainString();
                        Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                        BigDecimal itemTotal = priceVal.multiply(BigDecimal.valueOf(quantity));
                        String total = "$" + itemTotal.toPlainString();

                        // Item bilgilerini alt alta yaz - uzun isimleri birden fazla satıra böl
                        // "Item: " etiketinin genişliğini hesapla
                        float itemLabelWidth = PDType1Font.HELVETICA.getStringWidth("Item: ") / 1000.0f * fontSize;
                        float availableWidth = maxTextWidth - itemLabelWidth;
                        
                        // Item name'i wrap et
                        List<String> itemNameLines = wrapText(itemName, availableWidth, PDType1Font.HELVETICA, fontSize);
                        
                        // İlk satırda "Item: " + item name'in ilk kısmı
                        if (!itemNameLines.isEmpty()) {
                            if (currentY < 100) break;
                            contentStream.beginText();
                            contentStream.newLineAtOffset(margin, currentY);
                            contentStream.showText("Item: " + itemNameLines.get(0));
                            contentStream.endText();
                            currentY -= lineHeight;
                            
                            // Sonraki satırlarda sadece item name'in devamı (girintili)
                            for (int j = 1; j < itemNameLines.size(); j++) {
                                if (currentY < 100) break;
                                contentStream.beginText();
                                contentStream.newLineAtOffset(margin + itemLabelWidth, currentY);
                                contentStream.showText(itemNameLines.get(j));
                                contentStream.endText();
                                currentY -= lineHeight;
                            }
                        }

                        if (currentY < 100) break;

                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, currentY);
                        contentStream.showText("Qty: " + qty);
                        contentStream.endText();
                        currentY -= lineHeight;

                        if (currentY < 100) break;

                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, currentY);
                        contentStream.showText("Price: " + price);
                        contentStream.endText();
                        currentY -= lineHeight;

                        if (currentY < 100) break;

                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, currentY);
                        contentStream.showText("Total: " + total);
                        contentStream.endText();
                        currentY -= lineHeight * 1.5f; // Item'lar arası boşluk

                    }

                    // 2) ItemDto yoksa Order içindeki item'ları yaz
                } else if (order != null && order.getItems() != null) {
                    for (var item : order.getItems()) {
                        if (currentY < 100) {
                            break;
                        }

                        String itemName = "Product " + item.getProductId();
                        Product product = productRepository.findById(item.getProductId()).orElse(null);
                        if (product != null && product.getProductName() != null) {
                            itemName = product.getProductName();
                        }

                        String qty = String.valueOf(item.getQuantity() != null ? item.getQuantity() : 0);
                        BigDecimal priceVal = item.getPriceAtPurchase() != null
                                ? item.getPriceAtPurchase()
                                : BigDecimal.ZERO;
                        String price = "$" + priceVal.toPlainString();
                        Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                        BigDecimal itemTotal = priceVal.multiply(BigDecimal.valueOf(quantity));
                        String total = "$" + itemTotal.toPlainString();

                        // Item bilgilerini alt alta yaz - uzun isimleri birden fazla satıra böl
                        // "Item: " etiketinin genişliğini hesapla
                        float itemLabelWidth = PDType1Font.HELVETICA.getStringWidth("Item: ") / 1000.0f * fontSize;
                        float availableWidth = maxTextWidth - itemLabelWidth;
                        
                        // Item name'i wrap et
                        List<String> itemNameLines = wrapText(itemName, availableWidth, PDType1Font.HELVETICA, fontSize);
                        
                        // İlk satırda "Item: " + item name'in ilk kısmı
                        if (!itemNameLines.isEmpty()) {
                            if (currentY < 100) break;
                            contentStream.beginText();
                            contentStream.newLineAtOffset(margin, currentY);
                            contentStream.showText("Item: " + itemNameLines.get(0));
                            contentStream.endText();
                            currentY -= lineHeight;
                            
                            // Sonraki satırlarda sadece item name'in devamı (girintili)
                            for (int j = 1; j < itemNameLines.size(); j++) {
                                if (currentY < 100) break;
                                contentStream.beginText();
                                contentStream.newLineAtOffset(margin + itemLabelWidth, currentY);
                                contentStream.showText(itemNameLines.get(j));
                                contentStream.endText();
                                currentY -= lineHeight;
                            }
                        }

                        if (currentY < 100) break;

                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, currentY);
                        contentStream.showText("Qty: " + qty);
                        contentStream.endText();
                        currentY -= lineHeight;

                        if (currentY < 100) break;

                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, currentY);
                        contentStream.showText("Price: " + price);
                        contentStream.endText();
                        currentY -= lineHeight;

                        if (currentY < 100) break;

                        contentStream.beginText();
                        contentStream.newLineAtOffset(margin, currentY);
                        contentStream.showText("Total: " + total);
                        contentStream.endText();
                        currentY -= lineHeight * 1.5f; // Item'lar arası boşluk
                    }
                }

                // Total
                currentY -= 20;

                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, currentY);
                contentStream.showText("Total: $" +
                        (totalAmount != null ? totalAmount.toPlainString() : "0.00"));
                contentStream.endText();

                contentStream.close();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
}
