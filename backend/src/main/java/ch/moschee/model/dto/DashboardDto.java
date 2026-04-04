package ch.moschee.model.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DashboardDto {
    private long totalMembers;
    private long activeMembers;
    private long paidThisYear;
    private long unpaidThisYear;
    private BigDecimal totalCollectedThisYear;
    private BigDecimal cashBookBalance;
}
