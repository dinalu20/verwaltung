package ch.moschee.model.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class FeeImportResult {
    private List<FeeImportRow> rows = new ArrayList<>();
    private int totalRows;
    private int matchedCount;
    private int unmatchedCount;
    private int lowConfidenceCount;
    private List<Integer> years = new ArrayList<>();
}
