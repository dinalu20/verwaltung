package ch.moschee.controller;

import ch.moschee.model.dto.PaymentDto;
import ch.moschee.model.dto.PaymentRequest;
import ch.moschee.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','KASSIER')")
    public ResponseEntity<PaymentDto> createPayment(@Valid @RequestBody PaymentRequest request, Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(paymentService.createPayment(request, username));
    }

    @GetMapping
    public ResponseEntity<Page<PaymentDto>> getPayments(
            @RequestParam(required = false) Long memberId,
            @PageableDefault(size = 50) Pageable pageable) {
        if (memberId != null) {
            return ResponseEntity.ok(paymentService.getPaymentsByMember(memberId, pageable));
        }
        return ResponseEntity.ok(paymentService.getPayments(pageable));
    }
}
