package ch.moschee.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConfirmMatchRequest {
    @NotNull
    private Long lineId;
    private Long memberId;
    private Integer forYear;
    private boolean confirm;
}
