package ch.moschee.controller;

import ch.moschee.model.dto.AnnualFeeRow;
import ch.moschee.service.AnnualFeeService;
import ch.moschee.service.AnnualListPdfService;
import ch.moschee.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/annual-list")
@RequiredArgsConstructor
public class AnnualListController {

    private final AnnualFeeService annualFeeService;
    private final AnnualListPdfService pdfService;
    private final ExportService exportService;

    @GetMapping
    public ResponseEntity<List<AnnualFeeRow>> getAnnualList(
            @RequestParam(defaultValue = "2022") int fromYear,
            @RequestParam(defaultValue = "2026") int toYear) {
        return ResponseEntity.ok(annualFeeService.getAnnualList(fromYear, toYear));
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> getAnnualListPdf(
            @RequestParam(defaultValue = "2022") int fromYear,
            @RequestParam(defaultValue = "2026") int toYear,
            @RequestParam(defaultValue = "true") boolean onlyWithPayments) {
        List<AnnualFeeRow> rows = annualFeeService.getAnnualList(fromYear, toYear, onlyWithPayments);
        byte[] pdf = pdfService.generateAnnualListPdf(rows, fromYear, toYear);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=Jahresliste_" + fromYear + "-" + toYear + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/csv")
    public ResponseEntity<byte[]> getAnnualListCsv(
            @RequestParam(defaultValue = "2022") int fromYear,
            @RequestParam(defaultValue = "2026") int toYear) {
        List<AnnualFeeRow> data = annualFeeService.getAnnualList(fromYear, toYear);
        String[] headers = buildAnnualHeaders(fromYear, toYear);
        List<String[]> rows = buildAnnualRows(data, fromYear, toYear);
        byte[] csv = exportService.generateCsv(headers, rows);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=Jahresliste_" + fromYear + "-" + toYear + ".csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/excel")
    public ResponseEntity<byte[]> getAnnualListExcel(
            @RequestParam(defaultValue = "2022") int fromYear,
            @RequestParam(defaultValue = "2026") int toYear) {
        List<AnnualFeeRow> data = annualFeeService.getAnnualList(fromYear, toYear);
        String[] headers = buildAnnualHeaders(fromYear, toYear);
        List<String[]> rows = buildAnnualRows(data, fromYear, toYear);
        byte[] excel = exportService.generateExcel(headers, rows, "Jahresliste");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=Jahresliste_" + fromYear + "-" + toYear + ".xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    private String[] buildAnnualHeaders(int fromYear, int toYear) {
        List<String> headers = new ArrayList<>(List.of("Nr.", "Nachname", "Vorname"));
        for (int y = fromYear; y <= toYear; y++) {
            headers.add(String.valueOf(y));
        }
        return headers.toArray(new String[0]);
    }

    private List<String[]> buildAnnualRows(List<AnnualFeeRow> data, int fromYear, int toYear) {
        List<String[]> rows = new ArrayList<>();
        for (AnnualFeeRow r : data) {
            List<String> row = new ArrayList<>(List.of(
                    String.valueOf(r.getRowNumber()),
                    r.getLastName(),
                    r.getFirstName()
            ));
            for (int y = fromYear; y <= toYear; y++) {
                BigDecimal paid = r.getYearlyPayments().get(y);
                row.add(paid != null && paid.compareTo(BigDecimal.ZERO) > 0 ? paid.toPlainString() : "");
            }
            rows.add(row.toArray(new String[0]));
        }
        return rows;
    }
}
