package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.example.onlinestorebackend.Dto.PaymentRequestDto;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.User;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    public byte[] generateInvoicePdf(String invoiceId, Order order, User user, 
                                     BigDecimal totalAmount, LocalDateTime invoiceDate,
                                     PaymentRequestDto.ItemDto[] items) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float margin = 50;
                float yPosition = 750;
                float lineHeight = 20;

                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 20);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("INVOICE");
                contentStream.endText();

                yPosition -= 40;

                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Invoice ID: " + invoiceId);
                contentStream.endText();

                yPosition -= lineHeight;
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Date: " + invoiceDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
                contentStream.endText();

                if (order != null) {
                    yPosition -= lineHeight;
                    contentStream.beginText();
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText("Order ID: " + order.getOrderId());
                    contentStream.endText();
                }

                yPosition -= 30;

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

                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Items:");
                contentStream.endText();

                yPosition -= lineHeight;

                float tableY = yPosition;
                float itemX = margin;
                float qtyX = margin + 300;
                float priceX = margin + 380;
                float totalX = margin + 480;

                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 10);
                contentStream.beginText();
                contentStream.newLineAtOffset(itemX, tableY);
                contentStream.showText("Item");
                contentStream.endText();
                contentStream.beginText();
                contentStream.newLineAtOffset(qtyX, tableY);
                contentStream.showText("Qty");
                contentStream.endText();
                contentStream.beginText();
                contentStream.newLineAtOffset(priceX, tableY);
                contentStream.showText("Price");
                contentStream.endText();
                contentStream.beginText();
                contentStream.newLineAtOffset(totalX, tableY);
                contentStream.showText("Total");
                contentStream.endText();

                tableY -= lineHeight;
                contentStream.setFont(PDType1Font.HELVETICA, 10);

                if (items != null && items.length > 0) {
                    for (PaymentRequestDto.ItemDto item : items) {
                        if (tableY < 100) {
                            break;
                        }
                        String itemName = "Product " + item.getProductId();
                        String qty = String.valueOf(item.getQuantity());
                        String price = "$" + (item.getPrice() != null ? item.getPrice().toPlainString() : "0.00");
                        BigDecimal itemTotal = item.getPrice() != null 
                            ? item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                            : BigDecimal.ZERO;
                        String total = "$" + itemTotal.toPlainString();

                        contentStream.beginText();
                        contentStream.newLineAtOffset(itemX, tableY);
                        contentStream.showText(itemName);
                        contentStream.endText();
                        contentStream.beginText();
                        contentStream.newLineAtOffset(qtyX, tableY);
                        contentStream.showText(qty);
                        contentStream.endText();
                        contentStream.beginText();
                        contentStream.newLineAtOffset(priceX, tableY);
                        contentStream.showText(price);
                        contentStream.endText();
                        contentStream.beginText();
                        contentStream.newLineAtOffset(totalX, tableY);
                        contentStream.showText(total);
                        contentStream.endText();

                        tableY -= lineHeight;
                    }
                } else if (order.getItems() != null) {
                    for (var item : order.getItems()) {
                        if (tableY < 100) {
                            break;
                        }
                        String itemName = "Product " + item.getProductId();
                        String qty = String.valueOf(item.getQuantity());
                        String price = "$" + (item.getPriceAtPurchase() != null 
                            ? item.getPriceAtPurchase().toPlainString() 
                            : "0.00");
                        BigDecimal itemTotal = item.getPriceAtPurchase() != null
                            ? item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity()))
                            : BigDecimal.ZERO;
                        String total = "$" + itemTotal.toPlainString();

                        contentStream.beginText();
                        contentStream.newLineAtOffset(itemX, tableY);
                        contentStream.showText(itemName);
                        contentStream.endText();
                        contentStream.beginText();
                        contentStream.newLineAtOffset(qtyX, tableY);
                        contentStream.showText(qty);
                        contentStream.endText();
                        contentStream.beginText();
                        contentStream.newLineAtOffset(priceX, tableY);
                        contentStream.showText(price);
                        contentStream.endText();
                        contentStream.beginText();
                        contentStream.newLineAtOffset(totalX, tableY);
                        contentStream.showText(total);
                        contentStream.endText();

                        tableY -= lineHeight;
                    }
                }

                tableY -= 20;

                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 12);
                contentStream.beginText();
                contentStream.newLineAtOffset(totalX - 50, tableY);
                contentStream.showText("Total: $" + totalAmount.toPlainString());
                contentStream.endText();

                contentStream.close();
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }
}

