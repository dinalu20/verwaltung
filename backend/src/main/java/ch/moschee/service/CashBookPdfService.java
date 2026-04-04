package ch.moschee.service;

import ch.moschee.model.dto.CashBookDto;
import ch.moschee.model.dto.CashBookEntryDto;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

@Service
public class CashBookPdfService {

    public byte[] generateCashBookPdf(CashBookDto dto) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 20, 20, 25, 25);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            Font boldCellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font summaryFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font summaryValueFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Paragraph header = new Paragraph("MOSCHEE BUHARA SULGEN", titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            doc.add(header);

            Paragraph address = new Paragraph("Romanshornerstrasse 10, 8583 Sulgen", subtitleFont);
            address.setAlignment(Element.ALIGN_CENTER);
            doc.add(address);

            Paragraph bookTitle = new Paragraph(dto.getName(), titleFont);
            bookTitle.setAlignment(Element.ALIGN_CENTER);
            bookTitle.setSpacingBefore(10);
            bookTitle.setSpacingAfter(6);
            doc.add(bookTitle);

            PdfPTable summaryTable = new PdfPTable(4);
            summaryTable.setWidthPercentage(100);
            summaryTable.setSpacingAfter(12);

            addSummaryCell(summaryTable, "Eröffnung:", "CHF " + format(dto.getOpeningBalance()), summaryFont, summaryValueFont);
            addSummaryCell(summaryTable, "Eingänge:", "CHF " + format(dto.getTotalIn()), summaryFont, summaryValueFont);
            addSummaryCell(summaryTable, "Ausgänge:", "CHF " + format(dto.getTotalOut()), summaryFont, summaryValueFont);
            addSummaryCell(summaryTable, "Saldo:", "CHF " + format(dto.getCurrentBalance()), summaryFont, summaryValueFont);

            doc.add(summaryTable);

            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.3f, 1f, 3f, 1.3f, 1.3f, 1.3f, 1.8f});

            String[] headers = {"Datum", "Beleg Nr.", "Beschreibung", "Eingang", "Ausgang", "Saldo", "Empfänger"};
            for (String h : headers) {
                addHeaderCell(table, h, headerFont);
            }

            List<CashBookEntryDto> entries = dto.getEntries();
            if (entries != null) {
                for (CashBookEntryDto e : entries) {
                    addCell(table, e.getEntryDate(), cellFont, Element.ALIGN_LEFT);
                    addCell(table, e.getReceiptNumber() != null ? e.getReceiptNumber() : "", cellFont, Element.ALIGN_LEFT);
                    addCell(table, e.getDescription(), cellFont, Element.ALIGN_LEFT);
                    addCell(table, e.getAmountIn() != null && e.getAmountIn().compareTo(BigDecimal.ZERO) > 0 ? "CHF " + format(e.getAmountIn()) : "", cellFont, Element.ALIGN_RIGHT);
                    addCell(table, e.getAmountOut() != null && e.getAmountOut().compareTo(BigDecimal.ZERO) > 0 ? "CHF " + format(e.getAmountOut()) : "", cellFont, Element.ALIGN_RIGHT);
                    addCell(table, e.getRunningBalance() != null ? "CHF " + format(e.getRunningBalance()) : "", boldCellFont, Element.ALIGN_RIGHT);
                    addCell(table, e.getRecipient() != null ? e.getRecipient() : "", cellFont, Element.ALIGN_LEFT);
                }
            }

            doc.add(table);
            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("CashBook PDF generation failed", e);
        }
    }

    private String format(BigDecimal val) {
        if (val == null) return "0.00";
        return String.format("%,.2f", val);
    }

    private void addSummaryCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        labelCell.setPaddingBottom(4);
        table.addCell(labelCell);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPaddingBottom(4);
        table.addCell(valueCell);
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(4);
        cell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setHorizontalAlignment(align);
        cell.setPadding(3);
        table.addCell(cell);
    }
}
