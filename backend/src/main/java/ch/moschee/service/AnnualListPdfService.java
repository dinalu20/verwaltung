package ch.moschee.service;

import ch.moschee.model.dto.AnnualFeeRow;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.List;

@Service
public class AnnualListPdfService {

    public byte[] generateAnnualListPdf(List<AnnualFeeRow> rows, int fromYear, int toYear) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            int yearCount = toYear - fromYear + 1;
            int totalCols = 3 + yearCount; // NR, MBIEMRI, EMRI, years...

            Document doc = new Document(PageSize.A3, 20, 20, 20, 20);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8);

            Paragraph title = new Paragraph("LISTA E ANTARËSISË " + fromYear + " - " + toYear, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10);
            doc.add(title);

            PdfPTable table = new PdfPTable(totalCols);
            table.setWidthPercentage(100);

            float[] widths = new float[totalCols];
            widths[0] = 1f;  // NR
            widths[1] = 3f;  // MBIEMRI
            widths[2] = 3f;  // EMRI
            for (int i = 3; i < totalCols; i++) widths[i] = 1.5f;
            table.setWidths(widths);

            addHeaderCell(table, "NR.", headerFont);
            addHeaderCell(table, "MBIEMRI", headerFont);
            addHeaderCell(table, "EMRI", headerFont);
            for (int y = fromYear; y <= toYear; y++) {
                addHeaderCell(table, String.valueOf(y), headerFont);
            }

            for (AnnualFeeRow row : rows) {
                addCell(table, String.valueOf(row.getRowNumber()), cellFont, Element.ALIGN_CENTER);
                addCell(table, row.getLastName(), cellFont, Element.ALIGN_LEFT);
                addCell(table, row.getFirstName(), cellFont, Element.ALIGN_LEFT);

                for (int y = fromYear; y <= toYear; y++) {
                    BigDecimal paid = row.getYearlyPayments().get(y);
                    String val = (paid != null && paid.compareTo(BigDecimal.ZERO) > 0)
                            ? paid.stripTrailingZeros().toPlainString()
                            : "";
                    addCell(table, val, cellFont, Element.ALIGN_CENTER);
                }
            }

            doc.add(table);
            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Annual list PDF generation failed", e);
        }
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
