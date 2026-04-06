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
import ch.moschee.repository.PaymentRepository;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final MemberMatchingService matchingService;
    private final AnnualFeeService annualFeeService;
    private final CashBookService cashBookService;
    private final AuditService auditService;

    @Transactional
    public BankImportDto importFile(MultipartFile file) {
        BankImport bankImport = BankImport.builder()
                .fileName(file.getOriginalFilename())
                .importDate(LocalDate.now())
                .status("PENDING")
                .build();
        bankImport = importRepository.save(bankImport);

        List<BankImportLine> lines = parseBankFile(file, bankImport);

        for (BankImportLine line : lines) {
            var match = matchingService.findBestMatch(line.getBookingText(), line.getAmount());
            if (match != null) {
                line.setSuggestedMember(match.member());
                line.setMatchConfidence(match.confidence());
            }
            lineRepository.save(line);
        }

        auditService.logAction("BankImport", bankImport.getId(), "IMPORT", null, file.getOriginalFilename());
        return toDto(bankImport);
    }

    public List<BankImportDto> getAllImports() {
        return importRepository.findAllByOrderByImportDateDesc()
                .stream().map(this::toDto).toList();
    }

    public BankImportDto getImportWithLines(Long id) {
        BankImport bi = importRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Import not found: " + id));
        BankImportDto dto = toDto(bi);
        List<BankImportLine> lines = lineRepository.findByBankImportIdOrderByBookingDateAsc(id);
        dto.setLines(lines.stream().map(this::toLineDto).toList());
        return dto;
    }

    @Transactional
    public void confirmMatch(ConfirmMatchRequest request) {
        BankImportLine line = lineRepository.findById(request.getLineId())
                .orElseThrow(() -> new RuntimeException("Line not found: " + request.getLineId()));

        if (request.isConfirm()) {
            Member member = null;
            if (request.getMemberId() != null) {
                member = line.getSuggestedMember();
                if (member == null || !member.getId().equals(request.getMemberId())) {
                    member = null; // will be resolved by controller
                }
            }

            line.setMatchStatus(MatchStatus.CONFIRMED);
            lineRepository.save(line);

            int forYear = request.getForYear() != null ? request.getForYear() : LocalDate.now().getYear();

            Payment payment = Payment.builder()
                    .member(member)
                    .amount(line.getAmount())
                    .paymentDate(line.getBookingDate() != null ? line.getBookingDate() : LocalDate.now())
                    .paymentType(PaymentType.BANK)
                    .purpose(PaymentPurpose.MEMBERSHIP_FEE)
                    .forYear(forYear)
                    .bankImportLineId(line.getId())
                    .build();
            payment = paymentRepository.save(payment);

            if (member != null) {
                annualFeeService.recordPayment(member.getId(), forYear, line.getAmount());
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
            log.info("CSV columns detected -- date:{} text:{} gutschrift:{} betrag:{}", cols.date, cols.text, cols.gutschrift, cols.betrag);

            String[] row;
            while ((row = reader.readNext()) != null) {
                try {
                    BankImportLine line = buildLine(row, cols, bankImport);
                    if (line != null) lines.add(line);
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
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(file.getInputStream().readAllBytes()))) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getPhysicalNumberOfRows() < 2) return lines;

            Row headerRow = sheet.getRow(0);
            String[] header = new String[headerRow.getLastCellNum()];
            for (int i = 0; i < header.length; i++) {
                Cell cell = headerRow.getCell(i);
                header[i] = cell != null ? getCellString(cell) : "";
            }

            ColumnMapping cols = detectColumns(header);
            log.info("Excel columns detected -- date:{} text:{} gutschrift:{} betrag:{}", cols.date, cols.text, cols.gutschrift, cols.betrag);

            DataFormatter formatter = new DataFormatter();
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                try {
                    String[] rowData = new String[header.length];
                    for (int c = 0; c < header.length; c++) {
                        Cell cell = row.getCell(c);
                        if (cell != null) {
                            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                                LocalDate ld = cell.getLocalDateTimeCellValue().toLocalDate();
                                rowData[c] = ld.format(DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                            } else {
                                rowData[c] = formatter.formatCellValue(cell);
                            }
                        } else {
                            rowData[c] = "";
                        }
                    }
                    BankImportLine line = buildLine(rowData, cols, bankImport);
                    if (line != null) lines.add(line);
                } catch (Exception e) {
                    log.warn("Skipping Excel row {}: {}", r, e.getMessage());
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse bank Excel file", e);
        }
        return lines;
    }

    private String getCellString(Cell cell) {
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf(cell.getNumericCellValue());
        return new DataFormatter().formatCellValue(cell);
    }

    private BankImportLine buildLine(String[] row, ColumnMapping cols, BankImport bankImport) {
        String dateStr = getCell(row, cols.date);
        String text = getCell(row, cols.text);

        String amountStr = getCell(row, cols.gutschrift);
        if (amountStr.isEmpty()) {
            amountStr = getCell(row, cols.betrag);
        }

        if (amountStr.isEmpty() || text.isEmpty()) return null;

        amountStr = amountStr.replace("'", "").replace(",", ".");
        BigDecimal amount;
        try {
            amount = new BigDecimal(amountStr);
        } catch (NumberFormatException e) {
            return null;
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return null;

        return BankImportLine.builder()
                .bankImport(bankImport)
                .bookingDate(parseDate(dateStr))
                .bookingText(text)
                .amount(amount)
                .matchStatus(MatchStatus.PENDING)
                .build();
    }

    private String getCell(String[] row, int col) {
        return (col >= 0 && col < row.length) ? row[col].trim() : "";
    }

    private static class ColumnMapping {
        int date = -1;
        int text = -1;
        int gutschrift = -1;
        int betrag = -1;
    }

    private ColumnMapping detectColumns(String[] header) {
        ColumnMapping cols = new ColumnMapping();
        cols.date = findCol(header, "Buchungsdatum", "Datum", "Date", "Valutadatum", "Valuta");
        cols.text = findCol(header, "Buchungstext", "Text", "Beschreibung", "Description", "Mitteilungen", "Auftragsart");
        cols.gutschrift = findCol(header, "Gutschrift", "Kredit", "Credit");
        cols.betrag = findCol(header, "Betrag", "Amount");
        return cols;
    }

    private int findCol(String[] header, String... candidates) {
        for (int i = 0; i < header.length; i++) {
            String h = header[i].trim().toLowerCase();
            for (String c : candidates) {
                if (h.contains(c.toLowerCase())) return i;
            }
        }
        return -1;
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
        return dto;
    }
}
