package ch.moschee.controller;

import ch.moschee.model.dto.BankImportDto;
import ch.moschee.model.dto.BankImportLineDto;
import ch.moschee.model.dto.ConfirmMatchRequest;
import ch.moschee.service.BankImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import ch.moschee.service.AnnualFeeService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bank-imports")
@RequiredArgsConstructor
public class BankImportController {

    private final BankImportService bankImportService;
    private final AnnualFeeService annualFeeService;

    @PostMapping("/preview")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<List<BankImportLineDto>> previewFile(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bankImportService.previewFile(file));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<BankImportDto> importFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "selectedIndices", required = false) String selectedIndicesStr) {
        List<Integer> selectedIndices = null;
        if (selectedIndicesStr != null && !selectedIndicesStr.isBlank()) {
            selectedIndices = java.util.Arrays.stream(selectedIndicesStr.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .toList();
        }
        return ResponseEntity.ok(bankImportService.importFile(file, selectedIndices));
    }

    @GetMapping
    public ResponseEntity<List<BankImportDto>> getAllImports() {
        return ResponseEntity.ok(bankImportService.getAllImports());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BankImportDto> getImport(@PathVariable Long id) {
        return ResponseEntity.ok(bankImportService.getImportWithLines(id));
    }

    @PostMapping("/assign-member")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> assignMember(@RequestBody Map<String, Long> body) {
        bankImportService.assignMember(body.get("lineId"), body.get("memberId"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> confirmMatch(@Valid @RequestBody ConfirmMatchRequest request) {
        bankImportService.confirmMatch(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/open-years/{memberId}")
    public ResponseEntity<List<Integer>> getOpenYears(@PathVariable Long memberId) {
        return ResponseEntity.ok(annualFeeService.getOpenYears(memberId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> deleteImport(@PathVariable Long id) {
        bankImportService.deleteImport(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/lines/{lineId}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> deleteImportLine(@PathVariable Long lineId) {
        bankImportService.deleteImportLine(lineId);
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
