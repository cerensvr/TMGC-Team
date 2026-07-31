package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.AuthResponse;
import com.skinshelf.backend.dto.ChangePasswordRequest;
import com.skinshelf.backend.dto.LoginRequest;
import com.skinshelf.backend.dto.RegisterRequest;
import com.skinshelf.backend.dto.UpdateAccountRequest;
import com.skinshelf.backend.dto.UserResponse;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.AssistantMessageRepository;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import com.skinshelf.backend.repository.UserRepository;
import com.skinshelf.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final ProductRepository productRepository;
    private final AssistantMessageRepository assistantMessageRepository;
    private final SkinLogRepository skinLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(
            UserRepository userRepository,
            UserProfileRepository userProfileRepository,
            ProductRepository productRepository,
            AssistantMessageRepository assistantMessageRepository,
            SkinLogRepository skinLogRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.productRepository = productRepository;
        this.assistantMessageRepository = assistantMessageRepository;
        this.skinLogRepository = skinLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Bu e-posta adresi zaten kullanımda.");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName() == null ? "" : request.getLastName().trim());

        return toAuthResponse(userRepository.save(user));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.getEmail()))
                .orElseThrow(() -> new RuntimeException("E-posta veya şifre hatalı."));

        if (!passwordMatches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("E-posta veya şifre hatalı.");
        }

        if (!isBCryptHash(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user = userRepository.save(user);
        }

        return toAuthResponse(user);
    }

    @Transactional
    public UserResponse updateAccount(User user, UpdateAccountRequest request) {
        requireAuthenticatedUser(user);
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName() == null ? "" : request.getLastName().trim());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void changePassword(User user, ChangePasswordRequest request) {
        requireAuthenticatedUser(user);
        if (!passwordMatches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mevcut şifre hatalı.");
        }
        if (passwordMatches(request.getNewPassword(), user.getPassword())) {
            throw new RuntimeException("Yeni şifre mevcut şifreden farklı olmalıdır.");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(User user) {
        requireAuthenticatedUser(user);

        assistantMessageRepository.deleteByUser(user);
        skinLogRepository.deleteByUser(user);
        productRepository.deleteByUserId(user.getId());
        userProfileRepository.deleteByUserId(user.getId());
        userRepository.delete(user);
    }

    private void requireAuthenticatedUser(User user) {
        if (user == null || user.getId() == null) {
            throw new RuntimeException("Kullanıcı oturumu bulunamadı.");
        }
    }

    private AuthResponse toAuthResponse(User user) {
        return new AuthResponse(jwtService.generateToken(user), UserResponse.from(user));
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (isBCryptHash(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return storedPassword != null && storedPassword.equals(rawPassword);
    }

    private boolean isBCryptHash(String value) {
        return value != null && (value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$"));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
