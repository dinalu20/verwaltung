package ch.moschee.service;

import ch.moschee.model.dto.BankImportDto;
import ch.moschee.model.dto.BankImportLineDto;
import ch.moschee.model.dto.ConfirmMatchRequest;
import ch.moschee.model.entity.*;
import ch.moschee.model.enums.MatchStatus;
import ch.moschee.model.enums.PaymentPurpose;
import ch.moschee.model.enums.PaymentType;
import ch.moschee.repository.BankImportLineRepository;
import ch.moschee.repository.BankImportRepository;
import ch.moschee.repository.MemberRepository;
import ch.moschee.repository.PaymentRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import ch.moschee.util.CsvCharsetDetector;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BankImportService {

    private final BankImportRepository importRepository;
    private final BankImportLineRepository lineRepository;
    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final MemberMatchingService matchingService;
    private final AnnualFeeService annualFeeService;
    private final CashBookService cashBookService;
    private final AuditService auditService;

    /**
     * Preview: parse file + run matching, return DTOs without saving anything to DB.
     * Each line gets a temporary index used to identify it in the confirm step.
     */
    public List<BankImportLineDto> previewFile(MultipartFile file) {
        BankImport dummy = BankImport.builder()
                .fileName(file.getOriginalFilename())
                .importDate(LocalDate.now())
                .status("PREVIEW")
                .build();

        List<BankImportLine> lines = parseBankFile(file, dummy);
        log.info("Preview parsed {} lines from file {}", lines.size(), file.getOriginalFilename());

        List<BankImportLineDto> result = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            BankImportLine line = lines.get(i);
            BankImportLineDto dto = new BankImportLineDto();
            dto.setId((long) i); // temporary index
            dto.setBookingDate(line.getBookingDate() != null ? line.getBookingDate().toString() : null);
            dto.setBookingText(line.getBookingText());
            dto.setAmount(line.getAmount());
            dto.setIsDebit(line.getIsDebit());
            dto.setMatchConfidence(0);
            dto.setMatchStatus("PENDING");

            if (!Boolean.TRUE.equals(line.getIsDebit())) {
                var match = matchingService.findBestMatch(line.getBookingText(), line.getAmount());
                if (match != null) {
                    dto.setSuggestedMemberId(match.member().getId());
                    dto.setSuggestedMemberName(match.member().getFullName());
                    dto.setMatchConfidence(match.confidence());
                }
            }
            result.add(dto);
        }
        return result;
    }

    /**
     * Confirm import: re-parse the file, save only lines at the given indices.
     */
    @Transactional
    public BankImportDto importFile(MultipartFile file, List<Integer> selectedIndices) {
        BankImport bankImport = BankImport.builder()
                .fileName(file.getOriginalFilename())
                .importDate(LocalDate.now())
                .status("PENDING")
                .build();
        bankImport = importRepository.save(bankImport);

        List<BankImportLine> allLines = parseBankFile(file, bankImport);
        log.info("Parsed {} lines from file {}", allLines.size(), file.getOriginalFilename());

        // If no selection provided, import all lines
        var selected = (selectedIndices != null && !selectedIndices.isEmpty())
                ? new java.util.HashSet<>(selectedIndices)
                : null;

        int matchCount = 0;
        int creditCount = 0;
        int debitCount = 0;
        for (int i = 0; i < allLines.size(); i++) {
            if (selected != null && !selected.contains(i)) continue;

            BankImportLine line = allLines.get(i);
            if (Boolean.TRUE.equals(line.getIsDebit())) {
                debitCount++;
            } else {
                creditCount++;
                var match = matchingService.findBestMatch(line.getBookingText(), line.getAmount());
                if (match != null) {
                    line.setSuggestedMember(match.member());
                    line.setMatchConfidence(match.confidence());
                    matchCount++;
                }
            }
            lineRepository.save(line);
        }
        log.info("Import complete: {} credits, {} debits, {} matched members", creditCount, debitCount, matchCount);

        auditService.logAction("BankImport", bankImport.getId(), "IMPORT", null, file.getOriginalFilename());
        return toDto(bankImport);
    }

    public List<BankImportDto> getAllImports() {
        return importRepository.findAllByOrderByImportDateDesc()
                .stream().map(this::toDto).toList();
    }

    @Transactional
    public void deleteImport(Long id) {
        BankImport bi = importRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Import not found: " + id));

        List<BankImportLine> lines = lineRepository.findByBankImportIdOrderByBookingDateAsc(id);
        List<Long> lineIds = lines.stream().map(BankImportLine::getId).toList();

        if (!lineIds.isEmpty()) {
            // Reverse annual fee payments and delete associated payment records
            List<Payment> payments = paymentRepository.findByBankImportLineIdIn(lineIds);
            for (Payment p : payments) {
                if (p.getMember() != null && p.getForYear() != null) {
                    annualFeeService.undoPay(p.getMember().getId(), p.getForYear());
                }
            }
            paymentRepository.deleteAll(payments);
        }

        lineRepository.deleteAllByBankImportId(id);
        importRepository.delete(bi);

        auditService.logAction("BankImport", id, "DELETE", null, bi.getFileName());
        log.info("Deleted bank import {} with {} lines", id, lineIds.size());
    }

    @Transactional
    public void deleteImportLine(Long lineId) {
        BankImportLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new RuntimeException("Line not found: " + lineId));

        List<Payment> payments = paymentRepository.findByBankImportLineId(lineId);
        for (Payment p : payments) {
            if (p.getMember() != null && p.getForYear() != null) {
                annualFeeService.undoPay(p.getMember().getId(), p.getForYear());
            }
        }
        paymentRepository.deleteAll(payments);
        lineRepository.delete(line);

        log.info("Deleted bank import line {}", lineId);
    }

    @Transactional(readOnly = true)
    public BankImportDto getImportWithLines(Long id) {
        BankImport bi = importRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Import not found: " + id));
        BankImportDto dto = toDto(bi);
        List<BankImportLine> lines = lineRepository.findByBankImportIdWithMember(id);
        dto.setLines(lines.stream().map(this::toLineDto).toList());
        return dto;
    }

    @Transactional
    public void assignMember(Long lineId, Long memberId) {
        BankImportLine line = lineRepository.findById(lineId)
                .orElseThrow(() -> new RuntimeException("Line not found: " + lineId));
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Member not found: " + memberId));
        line.setSuggestedMember(member);
        line.setMatchConfidence(100);
        lineRepository.save(line);
    }

    @Transactional
    public void confirmMatch(ConfirmMatchRequest request) {
        BankImportLine line = lineRepository.findById(request.getLineId())
                .orElseThrow(() -> new RuntimeException("Line not found: " + request.getLineId()));

        if (request.isConfirm()) {
            Member member = null;
            if (request.getMemberId() != null) {
                if (line.getSuggestedMember() != null && line.getSuggestedMember().getId().equals(request.getMemberId())) {
                    member = line.getSuggestedMember();
                } else {
                    member = memberRepository.findById(request.getMemberId())
                            .orElseThrow(() -> new RuntimeException("Member not found: " + request.getMemberId()));
                    line.setSuggestedMember(member);
                }
            }

            line.setMatchStatus(MatchStatus.CONFIRMED);
            lineRepository.save(line);

            LocalDate paymentDate = line.getBookingDate() != null ? line.getBookingDate() : LocalDate.now();

            if (member != null && request.getForYear() == null) {
                // Auto-split: distribute across open years (oldest first)
                var allocations = annualFeeService.distributePayment(member.getId(), line.getAmount());
                for (var entry : allocations) {
                    Payment payment = Payment.builder()
                            .member(member)
                            .amount(entry.getValue())
                            .paymentDate(paymentDate)
                            .paymentType(PaymentType.BANK)
                            .purpose(PaymentPurpose.MEMBERSHIP_FEE)
                            .forYear(entry.getKey())
                            .bankImportLineId(line.getId())
                            .build();
                    paymentRepository.save(payment);
                }
                log.info("Auto-split payment of {} for member {} across years: {}",
                        line.getAmount(), member.getFullName(),
                        allocations.stream().map(e -> e.getKey() + "=" + e.getValue()).toList());
            } else {
                // Specific year given (or no member)
                int forYear = request.getForYear() != null ? request.getForYear() : LocalDate.now().getYear();
                Payment payment = Payment.builder()
                        .member(member)
                        .amount(line.getAmount())
                        .paymentDate(paymentDate)
                        .paymentType(PaymentType.BANK)
                        .purpose(PaymentPurpose.MEMBERSHIP_FEE)
                        .forYear(forYear)
                        .bankImportLineId(line.getId())
                        .build();
                paymentRepository.save(payment);

                if (member != null) {
                    annualFeeService.recordPayment(member.getId(), forYear, line.getAmount());
                }
            }
        } else {
            line.setMatchStatus(MatchStatus.REJECTED);
            lineRepository.save(line);
        }
    }

    @Transactional
    public void confirmAllHighConfidence(Long importId, int minConfidence) {
        List<BankImportLine> pending = lineRepository.findByBankImportIdAndMatchStatus(importId, MatchStatus.PENDING);
        for (BankImportLine line : pending) {
            if (line.getMatchConfidence() != null && line.getMatchConfidence() >= minConfidence && line.getSuggestedMember() != null) {
                ConfirmMatchRequest req = new ConfirmMatchRequest();
                req.setLineId(line.getId());
                req.setMemberId(line.getSuggestedMember().getId());
                req.setConfirm(true);
                confirmMatch(req);
            }
        }
    }

    // ── Parsing ──────────────────────────────────────────────────────────────

    private List<BankImportLine> parseBankFile(MultipartFile file, BankImport bankImport) {
        String fileName = file.getOriginalFilename();
        boolean isExcel = fileName != null && (fileName.endsWith(".xlsx") || fileName.endsWith(".xls"));

        if (isExcel) {
            return parseExcelFile(file, bankImport);
        }
        return parseCsvFile(file, bankImport);
    }

    private List<BankImportLine> parseCsvFile(MultipartFile file, BankImport bankImport) {
        List<BankImportLine> lines = new ArrayList<>();
        try {
            byte[] data = file.getInputStream().readAllBytes();
            Charset charset = CsvCharsetDetector.detect(data);
            log.info("Bank CSV charset detected: {}", charset.displayName());

            CSVReader reader = new CSVReaderBuilder(
                    new InputStreamReader(CsvCharsetDetector.inputStream(data, charset), charset))
                    .withCSVParser(new CSVParserBuilder().withSeparator(';').withQuoteChar('"').build())
                    .build();

            String[] header = reader.readNext();
            if (header == null) return lines;

            ColumnMapping cols = detectColumns(header);
            log.info("CSV columns detected -- date:{} text:{} gutschrift:{} belastung:{} betrag:{}",
                    cols.date, cols.text, cols.gutschrift, cols.belastung, cols.betrag);

            LocalDate lastDate = null;
            String[] row;
            while ((row = reader.readNext()) != null) {
                try {
                    BankImportLine line = buildLine(row, cols, bankImport, lastDate);
                    if (line != null) {
                        lines.add(line);
                        if (line.getBookingDate() != null) {
                            lastDate = line.getBookingDate();
                        }
                    }
                } catch (Exception e) {
                    log.warn("Skipping bank import row: {}", e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse bank CSV file", e);
        }
        return lines;
    }

    private List<BankImportLine> parseExcelFile(MultipartFile file, BankImport bankImport) {
        List<BankImportLine> lines = new ArrayList<>();
        try {
            byte[] bytes = file.getInputStream().readAllBytes();
            log.info("Excel file size: {} bytes", bytes.length);

            ZipSecureFile.setMinInflateRatio(0.001);
            try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(bytes))) {
                Sheet sheet = workbook.getSheetAt(0);
                int totalRows = sheet.getLastRowNum();
                log.info("Excel sheet has {} rows (physical: {})", totalRows, sheet.getPhysicalNumberOfRows());
                if (totalRows < 1) return lines;

                DataFormatter formatter = new DataFormatter();

                // Auto-detect the header row (bank exports often have metadata rows before the header)
                int headerRowIndex = -1;
                String[] header = null;
                int colCount = 0;
                ColumnMapping cols = null;

                for (int r = 0; r <= Math.min(totalRows, 20); r++) {
                    Row candidateRow = sheet.getRow(r);
                    if (candidateRow == null) continue;
                    int cc = candidateRow.getLastCellNum();
                    if (cc <= 0) continue;

                    String[] candidateHeader = new String[cc];
                    for (int i = 0; i < cc; i++) {
                        Cell cell = candidateRow.getCell(i);
                        candidateHeader[i] = cell != null ? safeCellString(cell, formatter) : "";
                    }

                    ColumnMapping candidateCols = detectColumns(candidateHeader);
                    boolean hasDate = candidateCols.date >= 0 || candidateCols.valutaDate >= 0;
                    boolean hasAmount = candidateCols.gutschrift >= 0 || candidateCols.belastung >= 0 || candidateCols.betrag >= 0;
                    if (hasDate && hasAmount) {
                        headerRowIndex = r;
                        header = candidateHeader;
                        colCount = cc;
                        cols = candidateCols;
                        log.info("Header found at row {}: {}", r, String.join(" | ", header));
                        break;
                    }
                }

                if (headerRowIndex < 0 || cols == null) {
                    log.warn("Could not find a valid header row in Excel file");
                    return lines;
                }

                log.info("Excel columns detected -- date:{} text:{} gutschrift:{} belastung:{} betrag:{}",
                        cols.date, cols.text, cols.gutschrift, cols.belastung, cols.betrag);

                LocalDate lastDate = null;

                for (int r = headerRowIndex + 1; r <= totalRows; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    try {
                        String[] rowData = new String[colCount];
                        for (int c = 0; c < colCount; c++) {
                            rowData[c] = safeCellValue(row.getCell(c), c, cols, formatter);
                        }
                        BankImportLine line = buildLine(rowData, cols, bankImport, lastDate);
                        if (line != null) {
                            lines.add(line);
                            if (line.getBookingDate() != null) {
                                lastDate = line.getBookingDate();
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Skipping Excel row {}: {}", r, e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse bank Excel file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to parse bank Excel file: " + e.getMessage(), e);
        }
        log.info("Parsed {} lines from Excel", lines.size());
        return lines;
    }

    private String safeCellValue(Cell cell, int colIndex, ColumnMapping cols, DataFormatter formatter) {
        if (cell == null) return "";
        try {
            CellType type = cell.getCellType();
            if (type == CellType.FORMULA) {
                type = cell.getCachedFormulaResultType();
            }

            if (type == CellType.NUMERIC) {
                try {
                    if (DateUtil.isCellDateFormatted(cell)) {
                        LocalDate ld = cell.getLocalDateTimeCellValue().toLocalDate();
                        return ld.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                    }
                } catch (Exception e) {
                    // Fall through to numeric handling
                }

                double num = cell.getNumericCellValue();
                if (isLikelyExcelSerialDate(colIndex, cols) && num > 40000 && num < 60000) {
                    try {
                        LocalDate ld = DateUtil.getLocalDateTime(num).toLocalDate();
                        return ld.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                    } catch (Exception e) {
                        return String.valueOf((long) num);
                    }
                }
                return formatter.formatCellValue(cell);
            }

            if (type == CellType.STRING) {
                return cell.getStringCellValue();
            }

            if (type == CellType.BOOLEAN) {
                return String.valueOf(cell.getBooleanCellValue());
            }

            if (type == CellType.BLANK) {
                return "";
            }

            return formatter.formatCellValue(cell);
        } catch (Exception e) {
            try {
                return formatter.formatCellValue(cell);
            } catch (Exception ex) {
                return "";
            }
        }
    }

    private String safeCellString(Cell cell, DataFormatter formatter) {
        try {
            if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
            return formatter.formatCellValue(cell);
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isLikelyExcelSerialDate(int colIndex, ColumnMapping cols) {
        return colIndex == cols.date || colIndex == cols.valutaDate;
    }


    /**
     * Build a BankImportLine from a row. Returns null only if the row is completely empty/unparseable.
     * Detail rows (no date) inherit from the previous summary row.
     * Debits are stored with a positive amount but isDebit=true.
     */
    private BankImportLine buildLine(String[] row, ColumnMapping cols, BankImport bankImport, LocalDate inheritedDate) {
        String dateStr = getCell(row, cols.date);
        LocalDate bookingDate = parseDate(dateStr);

        // Collect all text columns into a single booking text
        StringBuilder textBuilder = new StringBuilder();
        appendIfPresent(textBuilder, getCell(row, cols.text));
        if (cols.textExtra >= 0) {
            appendIfPresent(textBuilder, getCell(row, cols.textExtra));
        }
        String text = textBuilder.toString().trim();

        // Smart amount resolution: try Betrag Einzelzahlung → Gutschrift → Belastung
        String einzelStr = getCell(row, cols.betrag);
        String gutschriftStr = getCell(row, cols.gutschrift);
        String belastungStr = getCell(row, cols.belastung);

        BigDecimal amount = null;
        boolean isDebit = false;

        if (!einzelStr.isEmpty()) {
            amount = parseAmount(einzelStr);
        }
        if (amount == null && !gutschriftStr.isEmpty()) {
            amount = parseAmount(gutschriftStr);
        }
        if (amount == null && !belastungStr.isEmpty()) {
            amount = parseAmount(belastungStr);
            if (amount != null) {
                isDebit = true;
            }
        }

        if (amount == null && text.isEmpty()) return null;
        if (amount == null) amount = BigDecimal.ZERO;

        // Detail rows without a date inherit from the last summary row
        if (bookingDate == null && inheritedDate != null) {
            bookingDate = inheritedDate;
        }

        // Ensure amount is positive; debit flag carries the direction
        amount = amount.abs();

        // Truncate booking text to 2000 chars
        if (text.length() > 2000) {
            text = text.substring(0, 2000);
        }

        return BankImportLine.builder()
                .bankImport(bankImport)
                .bookingDate(bookingDate)
                .bookingText(text.isEmpty() ? null : text)
                .amount(amount)
                .isDebit(isDebit)
                .matchStatus(MatchStatus.PENDING)
                .build();
    }

    private void appendIfPresent(StringBuilder sb, String val) {
        if (val != null && !val.isEmpty()) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append(val);
        }
    }

    private BigDecimal parseAmount(String s) {
        if (s == null || s.isBlank()) return null;
        s = s.trim().replace("'", "").replace(",", ".");
        // Remove currency prefix/suffix like "CHF " etc.
        s = s.replaceAll("[^\\d.\\-]", "");
        if (s.isEmpty()) return null;
        try {
            BigDecimal bd = new BigDecimal(s);
            return bd.compareTo(BigDecimal.ZERO) == 0 ? null : bd;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getCell(String[] row, int col) {
        return (col >= 0 && col < row.length) ? row[col].trim() : "";
    }

    // ── Column detection ─────────────────────────────────────────────────────

    private static class ColumnMapping {
        int date = -1;
        int valutaDate = -1;
        int text = -1;
        int textExtra = -1;
        int gutschrift = -1;
        int belastung = -1;
        int betrag = -1; // "Betrag Einzelzahlung"
    }

    private ColumnMapping detectColumns(String[] header) {
        ColumnMapping cols = new ColumnMapping();

        for (int i = 0; i < header.length; i++) {
            String h = header[i].trim().toLowerCase();

            // Date columns
            if (h.contains("buchungsdatum") || h.equals("datum") || h.equals("date")) {
                cols.date = i;
            } else if (h.contains("valutadatum") || h.contains("valuta")) {
                cols.valutaDate = i;
            }

            // Text columns
            if (h.contains("buchungstext") || h.equals("text") || h.contains("beschreibung") || h.equals("description")) {
                cols.text = i;
            } else if (h.contains("mitteilungen") || h.contains("auftragsart")) {
                if (cols.text == -1) {
                    cols.text = i;
                } else {
                    cols.textExtra = i;
                }
            }

            // Amount columns – match specific names first
            if (h.contains("betrag einzelzahlung")) {
                cols.betrag = i;
            } else if (h.contains("gutschrift") || h.contains("kredit") || h.equals("credit")) {
                cols.gutschrift = i;
            } else if (h.contains("belastung") || h.contains("debit")) {
                cols.belastung = i;
            } else if ((h.equals("betrag") || h.equals("amount")) && cols.betrag == -1) {
                cols.betrag = i;
            }
        }

        // Fall back: if no primary date found, use valuta date
        if (cols.date == -1 && cols.valutaDate >= 0) {
            cols.date = cols.valutaDate;
        }

        return cols;
    }

    private LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        s = s.trim();
        for (String pattern : List.of("dd.MM.yyyy", "yyyy-MM-dd", "dd/MM/yyyy")) {
            try {
                return LocalDate.parse(s, DateTimeFormatter.ofPattern(pattern));
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ── DTO mapping ──────────────────────────────────────────────────────────

    private BankImportDto toDto(BankImport bi) {
        BankImportDto dto = new BankImportDto();
        dto.setId(bi.getId());
        dto.setFileName(bi.getFileName());
        dto.setImportDate(bi.getImportDate().toString());
        dto.setStatus(bi.getStatus());
        dto.setTotalLines(lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.PENDING)
                + lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.CONFIRMED)
                + lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.REJECTED)
                + lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.IGNORED));
        dto.setPendingLines(lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.PENDING));
        dto.setConfirmedLines(lineRepository.countByBankImportIdAndMatchStatus(bi.getId(), MatchStatus.CONFIRMED));
        return dto;
    }

    private BankImportLineDto toLineDto(BankImportLine l) {
        BankImportLineDto dto = new BankImportLineDto();
        dto.setId(l.getId());
        dto.setBookingDate(l.getBookingDate() != null ? l.getBookingDate().toString() : null);
        dto.setBookingText(l.getBookingText());
        dto.setAmount(l.getAmount());
        if (l.getSuggestedMember() != null) {
            dto.setSuggestedMemberId(l.getSuggestedMember().getId());
            dto.setSuggestedMemberName(l.getSuggestedMember().getFullName());
        }
        dto.setMatchConfidence(l.getMatchConfidence());
        dto.setMatchStatus(l.getMatchStatus().name());
        dto.setIsDebit(l.getIsDebit());
        return dto;
    }
}
