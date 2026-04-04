package ch.moschee.service;

import ch.moschee.model.dto.AuthResponse;
import ch.moschee.model.dto.LoginRequest;
import ch.moschee.model.dto.UserDto;
import ch.moschee.model.entity.AppUser;
import ch.moschee.model.enums.Role;
import ch.moschee.repository.AppUserRepository;
import ch.moschee.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        AppUser user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String accessToken = tokenProvider.generateAccessToken(user.getUsername(), user.getRole().name());
        String refreshToken = tokenProvider.generateRefreshToken(user.getUsername(), user.getRole().name());

        return new AuthResponse(accessToken, refreshToken, user.getUsername(), user.getFullName(), user.getRole().name());
    }

    public AuthResponse refresh(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }
        String username = tokenProvider.getUsernameFromToken(refreshToken);
        String role = tokenProvider.getRoleFromToken(refreshToken);

        String newAccessToken = tokenProvider.generateAccessToken(username, role);
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new AuthResponse(newAccessToken, refreshToken, username, user.getFullName(), role);
    }

    @Transactional
    public UserDto createUser(UserDto dto) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        AppUser user = AppUser.builder()
                .username(dto.getUsername())
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .fullName(dto.getFullName())
                .role(Role.valueOf(dto.getRole()))
                .active(dto.getActive() != null ? dto.getActive() : true)
                .build();
        user = userRepository.save(user);
        auditService.logAction("AppUser", user.getId(), "CREATE", null, dto.getUsername());
        return toDto(user);
    }

    @Transactional
    public UserDto updateUser(Long id, UserDto dto) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setFullName(dto.getFullName());
        user.setRole(Role.valueOf(dto.getRole()));
        if (dto.getActive() != null) user.setActive(dto.getActive());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        }
        user = userRepository.save(user);
        auditService.logAction("AppUser", user.getId(), "UPDATE", null, dto.getUsername());
        return toDto(user);
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream().map(this::toDto).toList();
    }

    private UserDto toDto(AppUser user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole().name());
        dto.setActive(user.getActive());
        return dto;
    }
}
