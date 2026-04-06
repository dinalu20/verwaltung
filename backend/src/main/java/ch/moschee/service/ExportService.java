package ch.moschee.service;

import com.opencsv.CSVWriter;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@Slf4j
public class ExportService {

    public byte[] generateCsv(String[] headers, List<String[]> rows) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             CSVWriter writer = new CSVWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8),
                     ';', CSVWriter.DEFAULT_QUOTE_CHARACTER, CSVWriter.DEFAULT_ESCAPE_CHARACTER, CSVWriter.DEFAULT_LINE_END)) {
            baos.write(0xEF);
            baos.write(0xBB);
            baos.write(0xBF);
            writer.writeNext(headers);
            for (String[] row : rows) {
                writer.writeNext(row);
            }
            writer.flush();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("CSV generation failed", e);
        }
    }

    public byte[] generateExcel(String[] headers, List<String[]> rows, String sheetName) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                String[] values = rows.get(r);
                for (int c = 0; c < values.length; c++) {
                    Cell cell = row.createCell(c);
                    if (values[c] != null) {
                        try {
                            double num = Double.parseDouble(values[c]);
                            cell.setCellValue(num);
                        } catch (NumberFormatException e) {
                            cell.setCellValue(values[c]);
                        }
                    }
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Excel generation failed", e);
        }
    }
}
