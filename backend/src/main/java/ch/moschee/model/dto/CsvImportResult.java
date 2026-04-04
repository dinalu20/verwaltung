package ch.moschee.model.dto;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class CsvImportResult {
    private int totalRows;
    private int imported;
    private int updated;
    private int skipped;
    private List<String> errors = new ArrayList<>();
    private List<MemberDto> preview = new ArrayList<>();
}
