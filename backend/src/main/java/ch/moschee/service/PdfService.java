package ch.moschee.service;

import ch.moschee.model.entity.Member;
import ch.moschee.model.entity.Receipt;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final float RECEIPT_WIDTH = 226f;  // 80mm
    private static final float RECEIPT_HEIGHT = 680f; // ~240mm, halbe A4-Seite

    public byte[] generateReceiptPdf(Receipt receipt, Member member, String createdByName, int forYear) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(new Rectangle(RECEIPT_WIDTH, RECEIPT_HEIGHT), 8, 8, 12, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font addressFont = FontFactory.getFont(FontFactory.HELVETICA, 7);
            Font receiptTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            Font amountFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font separatorFont = FontFactory.getFont(FontFactory.HELVETICA, 6);
            Font thankYouFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8);
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 7);

            // --- Header: Organisation ---
            Paragraph header = new Paragraph("MOSCHEE BUHARA SULGEN", titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            doc.add(header);

            Paragraph orgAddress = new Paragraph("Romanshornerstrasse 10, 8583 Sulgen", addressFont);
            orgAddress.setAlignment(Element.ALIGN_CENTER);
            orgAddress.setSpacingAfter(8);
            doc.add(orgAddress);

            doc.add(new Chunk(new LineSeparator(0.5f, 80, null, Element.ALIGN_CENTER, -2)));
            doc.add(new Paragraph(" ", separatorFont));

            // --- Quittungstitel ---
            Paragraph receiptTitle = new Paragraph("Quittung Nr. " + receipt.getReceiptNumber(), receiptTitleFont);
            receiptTitle.setAlignment(Element.ALIGN_CENTER);
            receiptTitle.setSpacingAfter(12);
            doc.add(receiptTitle);

            // --- Detailtabelle ---
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.1f, 1.9f});

            addRow(table, "Datum:", receipt.getReceiptDate().format(DATE_FMT), labelFont, valueFont);

            if (member != null) {
                addRow(table, "Mitglied:", member.getLastName() + " " + member.getFirstName(), labelFont, valueFont);

                if (hasText(member.getStreet())) {
                    addRow(table, "Adresse:", member.getStreet(), labelFont, valueFont);
                }
                String zipCity = buildZipCity(member.getZipCode(), member.getCity());
                if (!zipCity.isEmpty()) {
                    addRow(table, "", zipCity, labelFont, valueFont);
                }
            }

            String purposeDisplay = switch (receipt.getPurpose()) {
                case MEMBERSHIP_FEE -> "Mitgliedsbeitrag";
                case ZAKAT -> "Zakat";
                case FITRA -> "Fitra";
                case DONATION -> "Spende";
                case OTHER -> receipt.getPurposeText() != null ? receipt.getPurposeText() : "Sonstiges";
            };
            addRow(table, "Zweck:", purposeDisplay, labelFont, valueFont);
            addRow(table, "Jahr:", String.valueOf(forYear), labelFont, valueFont);
            addRow(table, "Zahlart:", receipt.getPaymentType().name().equals("CASH") ? "Bar" : "Bank", labelFont, valueFont);

            doc.add(table);

            // --- Betrag ---
            doc.add(new Paragraph(" ", separatorFont));
            doc.add(new Chunk(new LineSeparator(0.5f, 80, null, Element.ALIGN_CENTER, -2)));
            doc.add(new Paragraph(" ", separatorFont));

            Paragraph amountPara = new Paragraph("CHF " + receipt.getAmount().toPlainString(), amountFont);
            amountPara.setAlignment(Element.ALIGN_CENTER);
            amountPara.setSpacingBefore(6);
            amountPara.setSpacingAfter(6);
            doc.add(amountPara);

            doc.add(new Chunk(new LineSeparator(0.5f, 80, null, Element.ALIGN_CENTER, -2)));

            // --- Dankes-Nachricht ---
            Paragraph thankYou = new Paragraph("Vielen Dank für Ihren Beitrag!", thankYouFont);
            thankYou.setAlignment(Element.ALIGN_CENTER);
            thankYou.setSpacingBefore(12);
            thankYou.setSpacingAfter(8);
            doc.add(thankYou);

            // --- Footer: Erstellt von ---
            if (createdByName != null && !createdByName.isBlank()) {
                Paragraph createdBy = new Paragraph("Erstellt von: " + createdByName, footerFont);
                createdBy.setAlignment(Element.ALIGN_CENTER);
                createdBy.setSpacingBefore(4);
                doc.add(createdBy);
            }

            // Abreiss-Puffer: Leerraum am Ende damit nichts abgeschnitten wird
            for (int i = 0; i < 6; i++) {
                doc.add(new Paragraph(" ", separatorFont));
            }

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed", e);
        }
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPaddingBottom(5);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(5);
        table.addCell(valueCell);
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private String buildZipCity(String zip, String city) {
        StringBuilder sb = new StringBuilder();
        if (hasText(zip)) sb.append(zip);
        if (hasText(zip) && hasText(city)) sb.append(" ");
        if (hasText(city)) sb.append(city);
        return sb.toString();
    }
}
