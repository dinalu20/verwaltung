package ch.moschee.controller;

import ch.moschee.model.dto.BankImportDto;
import ch.moschee.model.dto.ConfirmMatchRequest;
import ch.moschee.service.BankImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/bank-imports")
@RequiredArgsConstructor
public class BankImportController {

    private final BankImportService bankImportService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<BankImportDto> importFile(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bankImportService.importFile(file));
    }

    @GetMapping
    public ResponseEntity<List<BankImportDto>> getAllImports() {
        return ResponseEntity.ok(bankImportService.getAllImports());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankImportDto> getImport(@PathVariable Long id) {
        return ResponseEntity.ok(bankImportService.getImportWithLines(id));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> confirmMatch(@Valid @RequestBody ConfirmMatchRequest request) {
        bankImportService.confirmMatch(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/confirm-all")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> confirmAllHighConfidence(
            @PathVariable Long id,
            @RequestParam(defaultValue = "90") int minConfidence) {
        bankImportService.confirmAllHighConfidence(id, minConfidence);
        return ResponseEntity.ok().build();
    }
}
