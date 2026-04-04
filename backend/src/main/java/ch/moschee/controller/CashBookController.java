package ch.moschee.controller;

import ch.moschee.model.dto.CashBookDto;
import ch.moschee.model.dto.CashBookEntryDto;
import ch.moschee.service.CashBookPdfService;
import ch.moschee.service.CashBookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cashbooks")
@RequiredArgsConstructor
public class CashBookController {

    private final CashBookService cashBookService;
    private final CashBookPdfService cashBookPdfService;

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

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CashBookDto> createCashBook(@Valid @RequestBody CashBookDto dto) {
        return ResponseEntity.ok(cashBookService.createCashBook(dto));
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
