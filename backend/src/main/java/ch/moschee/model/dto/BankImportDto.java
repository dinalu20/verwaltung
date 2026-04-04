package ch.moschee.model.dto;

import lombok.Data;
import java.util.List;

@Data
public class BankImportDto {
    private Long id;
    private String fileName;
    private String importDate;
    private String status;
    private long totalLines;
    private long pendingLines;
    private long confirmedLines;
    private List<BankImportLineDto> lines;
}
