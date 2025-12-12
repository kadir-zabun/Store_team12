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
     * PDFBox built-in fontlar (HELVETICA vb.) Unicode full desteklemez.
     * showText() bazı karakterlerde exception atarsa endText() çalışmadan stream kapanır
     * ve "You did not call endText()" warning'i gelir.
     *
     * Bu helper: newline temizler, Türkçe karakterleri sadeleştirir (WinAnsi-friendly),
     * ayrıca null-safe yapar.
     */
    private String sanitizePdfText(String s) {
        if (s == null) return "";
        s = s.replace("\r", " ").replace("\n", " ");

        // Türkçe karakterleri basit Latin'e indir
        s = s.replace('İ', 'I').replace('ı', 'i')
                .replace('Ş', 'S').replace('ş', 's')
                .replace('Ğ', 'G').replace('ğ', 'g')
                .replace('Ü', 'U').replace('ü', 'u')
                .replace('Ö', 'O').replace('ö', 'o')
                .replace('Ç', 'C').replace('ç', 'c');

        // PDFBox built-in fontlar için riskli olabilecek kontrol karakterlerini temizle
        s = s.replaceAll("\\p{C}", " ");

        return s;
    }

    /**
     * beginText/endText her durumda kapansın diye tek noktadan yazdırma
     */
    private void writeLine(PDPageContentStream cs, float x, float y, String text) throws IOException {
        cs.beginText();
        try {
            cs.newLineAtOffset(x, y);
            cs.showText(sanitizePdfText(text));
        } finally {
            cs.endText();
        }
    }

    /**
     * Metni belirli bir genişliğe göre birden fazla satıra böler
     */
    private List<String> wrapText(String text, float maxWidth, PDType1Font font, float fontSize) throws IOException {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return lines;
        }

        // wrap ölçümü için de sanitize et (width hesapları patlamasın)
        text = sanitizePdfText(text);

        String[] words = text.split("\\s+");
        StringBuilder currentLine = new StringBuilder();

        for (String word : words) {
            float wordWidth = font.getStringWidth(word) / 1000.0f * fontSize;

            if (wordWidth > maxWidth) {
                if (currentLine.length() > 0) {
                    lines.add(currentLine.toString());
                    currentLine = new StringBuilder();
                }

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
                String testLine = currentLine.length() > 0
                        ? currentLine.toString() + " " + word
                        : word;

                float textWidth = font.getStringWidth(testLine) / 1000.0f * fontSize;

                if (textWidth > maxWidth && currentLine.length() > 0) {
                    lines.add(currentLine.toString());
                    currentLine = new StringBuilder(word);
                } else {
                    currentLine = new StringBuilder(testLine);
                }
            }
        }

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
                writeLine(contentStream, margin, yPosition, "INVOICE");

                yPosition -= 40;

                // Invoice info
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                writeLine(contentStream, margin, yPosition, "Invoice ID: " + invoiceId);

                yPosition -= lineHeight;

                String dateStr = invoiceDate != null
                        ? invoiceDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                        : "-";

                writeLine(contentStream, margin, yPosition, "Date: " + dateStr);

                if (order != null) {
                    yPosition -= lineHeight;
                    writeLine(contentStream, margin, yPosition, "Order ID: " + order.getOrderId());
                }

                yPosition -= 30;

                // Bill To
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                writeLine(contentStream, margin, yPosition, "Bill To:");

                yPosition -= lineHeight;
                contentStream.setFont(PDType1Font.HELVETICA, 10);

                if (user != null) {
                    String name = user.getName() != null ? user.getName() : user.getUsername();
                    writeLine(contentStream, margin, yPosition, name);

                    yPosition -= lineHeight;

                    if (user.getEmail() != null) {
                        writeLine(contentStream, margin, yPosition, user.getEmail());
                        yPosition -= lineHeight;
                    }
                }

                yPosition -= 20;

                // Items başlık
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                writeLine(contentStream, margin, yPosition, "Items:");

                yPosition -= lineHeight;
                float currentY = yPosition;

                contentStream.setFont(PDType1Font.HELVETICA, 10);
                float fontSize = 10;
                float maxTextWidth = 450;

                // 1) PaymentRequestDto içinden item geldiyse onları yaz
                if (items != null && items.length > 0) {
                    for (PaymentRequestDto.ItemDto item : items) {
                        if (currentY < 100) break;

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

                        float itemLabelWidth = PDType1Font.HELVETICA.getStringWidth("Item: ") / 1000.0f * fontSize;
                        float availableWidth = maxTextWidth - itemLabelWidth;

                        List<String> itemNameLines = wrapText(itemName, availableWidth, PDType1Font.HELVETICA, fontSize);

                        if (!itemNameLines.isEmpty()) {
                            if (currentY < 100) break;
                            writeLine(contentStream, margin, currentY, "Item: " + itemNameLines.get(0));
                            currentY -= lineHeight;

                            for (int j = 1; j < itemNameLines.size(); j++) {
                                if (currentY < 100) break;
                                writeLine(contentStream, margin + itemLabelWidth, currentY, itemNameLines.get(j));
                                currentY -= lineHeight;
                            }
                        }

                        if (currentY < 100) break;
                        writeLine(contentStream, margin, currentY, "Qty: " + qty);
                        currentY -= lineHeight;

                        if (currentY < 100) break;
                        writeLine(contentStream, margin, currentY, "Price: " + price);
                        currentY -= lineHeight;

                        if (currentY < 100) break;
                        writeLine(contentStream, margin, currentY, "Total: " + total);
                        currentY -= lineHeight * 1.5f;
                    }

                } else if (order != null && order.getItems() != null) {
                    for (var item : order.getItems()) {
                        if (currentY < 100) break;

                        String itemName = "Product " + item.getProductId();
                        Product product = productRepository.findById(item.getProductId()).orElse(null);
                        if (product != null && product.getProductName() != null) {
                            itemName = product.getProductName();
                        }

                        String qty = String.valueOf(item.getQuantity() != null ? item.getQuantity() : 0);
                        BigDecimal priceVal = item.getPriceAtPurchase() != null ? item.getPriceAtPurchase() : BigDecimal.ZERO;
                        String price = "$" + priceVal.toPlainString();
                        Integer quantity = item.getQuantity() != null ? item.getQuantity() : 0;
                        BigDecimal itemTotal = priceVal.multiply(BigDecimal.valueOf(quantity));
                        String total = "$" + itemTotal.toPlainString();

                        float itemLabelWidth = PDType1Font.HELVETICA.getStringWidth("Item: ") / 1000.0f * fontSize;
                        float availableWidth = maxTextWidth - itemLabelWidth;

                        List<String> itemNameLines = wrapText(itemName, availableWidth, PDType1Font.HELVETICA, fontSize);

                        if (!itemNameLines.isEmpty()) {
                            if (currentY < 100) break;
                            writeLine(contentStream, margin, currentY, "Item: " + itemNameLines.get(0));
                            currentY -= lineHeight;

                            for (int j = 1; j < itemNameLines.size(); j++) {
                                if (currentY < 100) break;
                                writeLine(contentStream, margin + itemLabelWidth, currentY, itemNameLines.get(j));
                                currentY -= lineHeight;
                            }
                        }

                        if (currentY < 100) break;
                        writeLine(contentStream, margin, currentY, "Qty: " + qty);
                        currentY -= lineHeight;

                        if (currentY < 100) break;
                        writeLine(contentStream, margin, currentY, "Price: " + price);
                        currentY -= lineHeight;

                        if (currentY < 100) break;
                        writeLine(contentStream, margin, currentY, "Total: " + total);
                        currentY -= lineHeight * 1.5f;
                    }
                }

                // Total
                currentY -= 20;

                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                writeLine(contentStream, margin, currentY, "Total: $" + (totalAmount != null ? totalAmount.toPlainString() : "0.00"));

                // NOT: contentStream.close(); yazma. try-with-resources otomatik kapatır.
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
}
