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
    private static final float RECEIPT_WIDTH = 226f; // 80mm
    private static final float RECEIPT_HEIGHT = 500f;

    public byte[] generateReceiptPdf(Receipt receipt, Member member, String createdByName) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(new Rectangle(RECEIPT_WIDTH, RECEIPT_HEIGHT), 8, 8, 12, 12);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            Font addressFont = FontFactory.getFont(FontFactory.HELVETICA, 7);
            Font receiptTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            Font amountFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font separatorFont = FontFactory.getFont(FontFactory.HELVETICA, 6);

            Paragraph header = new Paragraph("MOSCHEE BUHARA SULGEN", titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            doc.add(header);

            Paragraph address = new Paragraph("Romanshornerstrasse 10, 8583 Sulgen", addressFont);
            address.setAlignment(Element.ALIGN_CENTER);
            address.setSpacingAfter(6);
            doc.add(address);

            doc.add(new Chunk(new LineSeparator(0.5f, 80, null, Element.ALIGN_CENTER, -2)));
            doc.add(new Paragraph(" ", separatorFont));

            Paragraph receiptTitle = new Paragraph("Quittung Nr. " + receipt.getReceiptNumber(), receiptTitleFont);
            receiptTitle.setAlignment(Element.ALIGN_CENTER);
            receiptTitle.setSpacingAfter(10);
            doc.add(receiptTitle);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.1f, 1.9f});

            addRow(table, "Datum:", receipt.getReceiptDate().format(DATE_FMT), labelFont, valueFont);
            if (member != null) {
                addRow(table, "Mitglied:", member.getLastName() + " " + member.getFirstName(), labelFont, valueFont);
            }

            String purposeDisplay = switch (receipt.getPurpose()) {
                case MEMBERSHIP_FEE -> "Mitgliedsbeitrag";
                case ZAKAT -> "Zakat";
                case FITRA -> "Fitra";
                case DONATION -> "Spende";
                case OTHER -> receipt.getPurposeText() != null ? receipt.getPurposeText() : "Sonstiges";
            };
            addRow(table, "Zweck:", purposeDisplay, labelFont, valueFont);
            addRow(table, "Zahlart:", receipt.getPaymentType().name().equals("CASH") ? "Bar" : "Bank", labelFont, valueFont);

            doc.add(table);

            doc.add(new Paragraph(" ", separatorFont));
            doc.add(new Chunk(new LineSeparator(0.5f, 80, null, Element.ALIGN_CENTER, -2)));
            doc.add(new Paragraph(" ", separatorFont));

            Paragraph amountPara = new Paragraph("CHF " + receipt.getAmount().toPlainString(), amountFont);
            amountPara.setAlignment(Element.ALIGN_CENTER);
            amountPara.setSpacingBefore(4);
            amountPara.setSpacingAfter(4);
            doc.add(amountPara);

            doc.add(new Chunk(new LineSeparator(0.5f, 80, null, Element.ALIGN_CENTER, -2)));

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
}
