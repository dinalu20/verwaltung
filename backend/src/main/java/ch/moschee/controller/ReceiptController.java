package ch.moschee.controller;

import ch.moschee.model.dto.ReceiptDto;
import ch.moschee.model.entity.Receipt;
import ch.moschee.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;

    @GetMapping
    public ResponseEntity<Page<ReceiptDto>> getReceipts(
            @RequestParam(required = false) Long memberId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String purpose,
            @RequestParam(required = false) String paymentType,
            @PageableDefault(size = 50) Pageable pageable) {
        if (memberId != null) {
            return ResponseEntity.ok(receiptService.getReceiptsByMember(memberId, pageable));
        }
        boolean hasFilters = (search != null && !search.isBlank()) || dateFrom != null || dateTo != null
                || (purpose != null && !purpose.isBlank()) || (paymentType != null && !paymentType.isBlank());
        if (hasFilters) {
            return ResponseEntity.ok(receiptService.searchReceipts(search, dateFrom, dateTo, purpose, paymentType, pageable));
        }
        return ResponseEntity.ok(receiptService.getReceipts(pageable));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getReceiptPdf(@PathVariable Long id) {
        Receipt receipt = receiptService.findById(id);
        if (receipt.getPdfData() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=Quittung_" + receipt.getReceiptNumber() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(receipt.getPdfData());
    }

    @PostMapping("/{id}/printed")
    public ResponseEntity<Void> markPrinted(@PathVariable Long id) {
        receiptService.markPrinted(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> deleteReceipt(@PathVariable Long id) {
        receiptService.deleteReceipt(id);
        return ResponseEntity.noContent().build();
    }
}
