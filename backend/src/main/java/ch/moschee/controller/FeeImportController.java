package ch.moschee.controller;

import ch.moschee.model.dto.FeeImportConfirmation;
import ch.moschee.model.dto.FeeImportResult;
import ch.moschee.service.ExcelFeeImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fee-import")
@RequiredArgsConstructor
public class FeeImportController {

    private final ExcelFeeImportService excelFeeImportService;

    @PostMapping("/preview")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<FeeImportResult> preview(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(excelFeeImportService.preview(file));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Map<String, Object>> confirmImport(
            @Valid @RequestBody List<FeeImportConfirmation> confirmations) {
        int count = excelFeeImportService.confirmImport(confirmations);
        return ResponseEntity.ok(Map.of("importedPayments", count));
    }
}
