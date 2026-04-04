package ch.moschee.service;

import ch.moschee.model.dto.FeeImportConfirmation;
import ch.moschee.model.dto.FeeImportResult;
import ch.moschee.model.dto.FeeImportRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelFeeImportService {

    private final MemberMatchingService matchingService;
    private final AnnualFeeService annualFeeService;

    private static final int COL_LAST_NAME = 1;
    private static final int COL_FIRST_NAME = 2;
    private static final int FIRST_YEAR_COL = 3;

    public FeeImportResult preview(MultipartFile file) {
        FeeImportResult result = new FeeImportResult();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) {
                return result;
            }

            List<Integer> years = parseYearColumns(headerRow);
            result.setYears(years);

            int rowNum = 0;
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String lastName = getCellString(row.getCell(COL_LAST_NAME));
                String firstName = getCellString(row.getCell(COL_FIRST_NAME));

                if (lastName == null || lastName.isBlank()) continue;

                rowNum++;
                result.setTotalRows(result.getTotalRows() + 1);

                FeeImportRow importRow = new FeeImportRow();
                importRow.setRowNumber(rowNum);
                importRow.setExcelLastName(lastName.trim());
                importRow.setExcelFirstName(firstName != null ? firstName.trim() : "");

                Map<Integer, BigDecimal> yearPayments = new LinkedHashMap<>();
                for (int y = 0; y < years.size(); y++) {
                    BigDecimal amount = getCellAmount(row.getCell(FIRST_YEAR_COL + y));
                    if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                        yearPayments.put(years.get(y), amount);
                    }
                }
                importRow.setYearPayments(yearPayments);

                String note = findNote(row, FIRST_YEAR_COL + years.size());
                importRow.setNote(note);

                var match = matchingService.findBestMatchByName(lastName.trim(), firstName != null ? firstName.trim() : "");
                if (match != null) {
                    importRow.setMatchedMemberId(match.member().getId());
                    importRow.setMatchedMemberName(match.member().getLastName() + " " + match.member().getFirstName());
                    importRow.setConfidence(match.confidence());

                    if (match.confidence() >= 85) {
                        importRow.setStatus("MATCHED");
                        result.setMatchedCount(result.getMatchedCount() + 1);
                    } else {
                        importRow.setStatus("LOW_CONFIDENCE");
                        result.setLowConfidenceCount(result.getLowConfidenceCount() + 1);
                    }
                } else {
                    importRow.setStatus("UNMATCHED");
                    result.setUnmatchedCount(result.getUnmatchedCount() + 1);
                }

                result.getRows().add(importRow);
            }

        } catch (Exception e) {
            log.error("Excel fee import preview failed", e);
            throw new RuntimeException("Excel-Datei konnte nicht gelesen werden: " + e.getMessage());
        }

        return result;
    }

    @Transactional
    public int confirmImport(List<FeeImportConfirmation> confirmations) {
        int count = 0;
        for (FeeImportConfirmation conf : confirmations) {
            if (conf.getMemberId() == null || conf.getYearPayments() == null) continue;

            for (var entry : conf.getYearPayments().entrySet()) {
                int year = entry.getKey();
                BigDecimal amount = entry.getValue();
                if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal amountDue = new BigDecimal("300.00");
                    annualFeeService.setPayment(conf.getMemberId(), year, amount, amountDue);
                    count++;
                }
            }
        }
        return count;
    }

    private List<Integer> parseYearColumns(Row headerRow) {
        List<Integer> years = new ArrayList<>();
        for (int c = FIRST_YEAR_COL; c < headerRow.getLastCellNum(); c++) {
            Cell cell = headerRow.getCell(c);
            if (cell == null) break;

            Integer year = getCellYear(cell);
            if (year == null || year < 2000 || year > 2100) break;
            years.add(year);
        }
        return years;
    }

    private Integer getCellYear(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (int) cell.getNumericCellValue();
            }
            if (cell.getCellType() == CellType.STRING) {
                return Integer.parseInt(cell.getStringCellValue().trim());
            }
        } catch (NumberFormatException ignored) {}
        return null;
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.STRING) {
            String val = cell.getStringCellValue();
            return (val == null || val.isBlank()) ? null : val;
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            return String.valueOf((int) cell.getNumericCellValue());
        }
        return null;
    }

    private BigDecimal getCellAmount(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                double val = cell.getNumericCellValue();
                if (val > 0) return BigDecimal.valueOf(val).setScale(2, java.math.RoundingMode.HALF_UP);
            }
            if (cell.getCellType() == CellType.STRING) {
                String s = cell.getStringCellValue().trim().replace(",", ".");
                if (!s.isEmpty()) {
                    double val = Double.parseDouble(s);
                    if (val > 0) return BigDecimal.valueOf(val).setScale(2, java.math.RoundingMode.HALF_UP);
                }
            }
        } catch (NumberFormatException ignored) {}
        return null;
    }

    private String findNote(Row row, int startCol) {
        for (int c = startCol; c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue();
                if (val != null && !val.isBlank()) return val.trim();
            }
        }
        return null;
    }
}
