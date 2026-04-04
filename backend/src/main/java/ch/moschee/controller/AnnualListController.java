package ch.moschee.controller;

import ch.moschee.model.dto.AnnualFeeRow;
import ch.moschee.service.AnnualFeeService;
import ch.moschee.service.AnnualListPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/annual-list")
@RequiredArgsConstructor
public class AnnualListController {

    private final AnnualFeeService annualFeeService;
    private final AnnualListPdfService pdfService;

    @GetMapping
    public ResponseEntity<List<AnnualFeeRow>> getAnnualList(
            @RequestParam(defaultValue = "2022") int fromYear,
            @RequestParam(defaultValue = "2026") int toYear) {
        return ResponseEntity.ok(annualFeeService.getAnnualList(fromYear, toYear));
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> getAnnualListPdf(
            @RequestParam(defaultValue = "2022") int fromYear,
            @RequestParam(defaultValue = "2026") int toYear) {
        List<AnnualFeeRow> rows = annualFeeService.getAnnualList(fromYear, toYear);
        byte[] pdf = pdfService.generateAnnualListPdf(rows, fromYear, toYear);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=Jahresliste_" + fromYear + "-" + toYear + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
