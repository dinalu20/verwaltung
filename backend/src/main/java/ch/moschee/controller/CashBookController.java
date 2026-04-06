package ch.moschee.controller;

import ch.moschee.model.dto.CashBookDto;
import ch.moschee.model.dto.CashBookEntryDto;
import ch.moschee.service.CashBookPdfService;
import ch.moschee.service.CashBookService;
import ch.moschee.service.ExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cashbooks")
@RequiredArgsConstructor
public class CashBookController {

    private final CashBookService cashBookService;
    private final CashBookPdfService cashBookPdfService;
    private final ExportService exportService;

    @GetMapping
    public ResponseEntity<List<CashBookDto>> getAllCashBooks() {
        return ResponseEntity.ok(cashBookService.getAllCashBooks());
    }

    @GetMapping("/last-balance")
    public ResponseEntity<Map<String, BigDecimal>> getLastClosedBalance() {
        return ResponseEntity.ok(Map.of("balance", cashBookService.getLastClosedBalance()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CashBookDto> getCashBook(@PathVariable Long id) {
        return ResponseEntity.ok(cashBookService.getCashBookWithEntries(id));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getCashBookPdf(@PathVariable Long id) {
        CashBookDto dto = cashBookService.getCashBookWithEntries(id);
        byte[] pdf = cashBookPdfService.generateCashBookPdf(dto);
        String filename = dto.getName().replaceAll("[^a-zA-Z0-9äöüÄÖÜ\\-_ ]", "") + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/{id}/csv")
    public ResponseEntity<byte[]> getCashBookCsv(@PathVariable Long id) {
        CashBookDto dto = cashBookService.getCashBookWithEntries(id);
        String[] headers = {"Datum", "Beleg Nr.", "Beschreibung", "Konto", "Empfänger", "Eingang", "Ausgang", "Saldo"};
        List<String[]> rows = buildExportRows(dto);
        byte[] csv = exportService.generateCsv(headers, rows);
        String filename = dto.getName().replaceAll("[^a-zA-Z0-9äöüÄÖÜ\\-_ ]", "") + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/{id}/excel")
    public ResponseEntity<byte[]> getCashBookExcel(@PathVariable Long id) {
        CashBookDto dto = cashBookService.getCashBookWithEntries(id);
        String[] headers = {"Datum", "Beleg Nr.", "Beschreibung", "Konto", "Empfänger", "Eingang", "Ausgang", "Saldo"};
        List<String[]> rows = buildExportRows(dto);
        byte[] excel = exportService.generateExcel(headers, rows, "Kassenbuch");
        String filename = dto.getName().replaceAll("[^a-zA-Z0-9äöüÄÖÜ\\-_ ]", "") + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    private List<String[]> buildExportRows(CashBookDto dto) {
        List<String[]> rows = new ArrayList<>();
        if (dto.getEntries() != null) {
            for (CashBookEntryDto e : dto.getEntries()) {
                rows.add(new String[]{
                        e.getEntryDate(),
                        e.getReceiptNumber() != null ? e.getReceiptNumber() : "",
                        e.getDescription(),
                        e.getAccount() != null ? e.getAccount() : "",
                        e.getRecipient() != null ? e.getRecipient() : "",
                        e.getAmountIn() != null ? e.getAmountIn().toPlainString() : "0",
                        e.getAmountOut() != null ? e.getAmountOut().toPlainString() : "0",
                        e.getRunningBalance() != null ? e.getRunningBalance().toPlainString() : ""
                });
            }
        }
        return rows;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CashBookDto> createCashBook(@Valid @RequestBody CashBookDto dto) {
        return ResponseEntity.ok(cashBookService.createCashBook(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CashBookDto> updateCashBook(@PathVariable Long id, @RequestBody CashBookDto dto) {
        return ResponseEntity.ok(cashBookService.updateCashBook(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> deleteCashBook(@PathVariable Long id) {
        cashBookService.deleteCashBook(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/entries")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CashBookEntryDto> addEntry(@Valid @RequestBody CashBookEntryDto dto) {
        return ResponseEntity.ok(cashBookService.addEntry(dto));
    }

    @PutMapping("/entries/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CashBookEntryDto> updateEntry(@PathVariable Long id, @Valid @RequestBody CashBookEntryDto dto) {
        return ResponseEntity.ok(cashBookService.updateEntry(id, dto));
    }

    @DeleteMapping("/entries/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long id) {
        cashBookService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN','VORSTAND')")
    public ResponseEntity<Void> closeCashBook(@PathVariable Long id) {
        cashBookService.closeCashBook(id);
        return ResponseEntity.ok().build();
    }
}
