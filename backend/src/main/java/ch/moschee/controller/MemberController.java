package ch.moschee.controller;

import ch.moschee.model.dto.CsvImportResult;
import ch.moschee.model.dto.MemberDto;
import ch.moschee.model.entity.MemberAnnualFee;
import ch.moschee.service.AnnualFeeService;
import ch.moschee.service.CsvImportService;
import ch.moschee.service.ExportService;
import ch.moschee.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;
    private final CsvImportService csvImportService;
    private final AnnualFeeService annualFeeService;
    private final ExportService exportService;

    @GetMapping
    public ResponseEntity<Page<MemberDto>> getMembers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 50, sort = "lastName") Pageable pageable) {
        return ResponseEntity.ok(memberService.getMembers(search, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberDto> getMember(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getMember(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<MemberDto> createMember(@Valid @RequestBody MemberDto dto) {
        return ResponseEntity.ok(memberService.createMember(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<MemberDto> updateMember(@PathVariable Long id, @Valid @RequestBody MemberDto dto) {
        return ResponseEntity.ok(memberService.updateMember(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> deactivateMember(@PathVariable Long id) {
        memberService.deactivateMember(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Void> reactivateMember(@PathVariable Long id) {
        memberService.reactivateMember(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/fees")
    public ResponseEntity<List<MemberAnnualFee>> getMemberFees(@PathVariable Long id) {
        return ResponseEntity.ok(annualFeeService.getMemberFees(id));
    }

    @PostMapping("/{id}/fees/{year}/quick-pay")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Map<String, Object>> quickPay(
            @PathVariable Long id,
            @PathVariable int year,
            @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal amount = null;
        if (body != null && body.containsKey("amount")) {
            amount = new BigDecimal(body.get("amount").toString());
        }
        annualFeeService.quickPay(id, year, amount);
        return ResponseEntity.ok(Map.of("memberId", id, "year", year, "status", "PAID"));
    }

    @PostMapping("/{id}/fees/{year}/undo-pay")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<Map<String, Object>> undoPay(
            @PathVariable Long id,
            @PathVariable int year) {
        annualFeeService.undoPay(id, year);
        return ResponseEntity.ok(Map.of("memberId", id, "year", year, "status", "OPEN"));
    }

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        List<MemberDto> members = getMemberList(search, status);
        String[] headers = {"ID", "Nachname", "Vorname", "Firma", "Strasse", "PLZ", "Ort", "Telefon Privat", "Telefon Mobil", "Status"};
        List<String[]> rows = buildMemberExportRows(members);
        byte[] csv = exportService.generateCsv(headers, rows);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Mitglieder.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        List<MemberDto> members = getMemberList(search, status);
        String[] headers = {"ID", "Nachname", "Vorname", "Firma", "Strasse", "PLZ", "Ort", "Telefon Privat", "Telefon Mobil", "Status"};
        List<String[]> rows = buildMemberExportRows(members);
        byte[] excel = exportService.generateExcel(headers, rows, "Mitglieder");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Mitglieder.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    private List<MemberDto> getMemberList(String search, String status) {
        Page<MemberDto> page = memberService.getMembers(search, status,
                Pageable.ofSize(10000));
        return page.getContent();
    }

    private List<String[]> buildMemberExportRows(List<MemberDto> members) {
        List<String[]> rows = new ArrayList<>();
        for (MemberDto m : members) {
            rows.add(new String[]{
                    m.getExternalId() != null ? m.getExternalId() : String.valueOf(m.getId()),
                    m.getLastName(),
                    m.getFirstName(),
                    m.getCompany() != null ? m.getCompany() : "",
                    m.getStreet() != null ? m.getStreet() : "",
                    m.getZipCode() != null ? m.getZipCode() : "",
                    m.getCity() != null ? m.getCity() : "",
                    m.getPhonePrivate() != null ? m.getPhonePrivate() : "",
                    m.getPhoneMobile() != null ? m.getPhoneMobile() : "",
                    m.getStatus()
            });
        }
        return rows;
    }

    @PostMapping("/import/preview")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CsvImportResult> previewImport(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(csvImportService.preview(file));
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<CsvImportResult> importMembers(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(csvImportService.importMembers(file));
    }
}
