package com.retrouvit.service;

import com.retrouvit.dto.*;
import com.retrouvit.entity.LostObject;
import com.retrouvit.entity.ObjectStatus;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.LostObjectRepository;
import com.retrouvit.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LostObjectService {

    private final LostObjectRepository lostObjectRepository;
    private final UserRepository userRepository;

    public LostObjectResponse create(LostObjectRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        LostObject lostObject = LostObject.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .location(request.getLocation())
                .city(request.getCity())
                .dateLost(request.getDateLost() != null ? request.getDateLost() : LocalDate.now())
                .image(request.getImage())
                .images(request.getImages())
                .reward(request.getReward())
                .user(user)
                .build();

        LostObject saved = lostObjectRepository.save(lostObject);
        user.setObjectsLost(user.getObjectsLost() + 1);
        userRepository.save(user);

        return toResponse(saved);
    }

    public LostObjectResponse getById(Long id) {
        LostObject lostObject = lostObjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objet perdu non trouvé"));
        lostObject.setViews(lostObject.getViews() + 1);
        lostObjectRepository.save(lostObject);
        return toResponse(lostObject);
    }

    public PageResponse<LostObjectResponse> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostObject> pageResult = lostObjectRepository.findAllActive(pageable);
        return toPageResponse(pageResult);
    }

    public PageResponse<LostObjectResponse> getByUserId(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostObject> pageResult = lostObjectRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return toPageResponse(pageResult);
    }

    public PageResponse<LostObjectResponse> getByCategory(String category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostObject> pageResult = lostObjectRepository.findByCategoryAndStatusOrderByCreatedAtDesc(category, ObjectStatus.ACTIVE, pageable);
        return toPageResponse(pageResult);
    }

    public PageResponse<LostObjectResponse> getByCity(String city, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostObject> pageResult = lostObjectRepository.findByCityAndStatusOrderByCreatedAtDesc(city, ObjectStatus.ACTIVE, pageable);
        return toPageResponse(pageResult);
    }

    // Non-paginated (used by MatchingEngine)
    public List<LostObjectResponse> getAll() {
        return lostObjectRepository.findAllActive().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<LostObjectResponse> getByUserId(Long userId) {
        return lostObjectRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public LostObjectResponse update(Long id, LostObjectRequest request, Long userId) {
        LostObject lostObject = lostObjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objet perdu non trouvé"));

        if (!lostObject.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Vous ne pouvez modifier que vos propres annonces");
        }

        if (request.getTitle() != null) lostObject.setTitle(request.getTitle());
        if (request.getDescription() != null) lostObject.setDescription(request.getDescription());
        if (request.getCategory() != null) lostObject.setCategory(request.getCategory());
        if (request.getLocation() != null) lostObject.setLocation(request.getLocation());
        if (request.getCity() != null) lostObject.setCity(request.getCity());
        if (request.getDateLost() != null) lostObject.setDateLost(request.getDateLost());
        if (request.getImage() != null) lostObject.setImage(request.getImage());
        if (request.getImages() != null) lostObject.setImages(request.getImages());
        if (request.getReward() != null) lostObject.setReward(request.getReward());

        LostObject updated = lostObjectRepository.save(lostObject);
        return toResponse(updated);
    }

    public void delete(Long id, Long userId) {
        LostObject lostObject = lostObjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objet perdu non trouvé"));

        if (!lostObject.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Vous ne pouvez supprimer que vos propres annonces");
        }

        lostObjectRepository.deleteById(id);
    }

    private PageResponse<LostObjectResponse> toPageResponse(Page<LostObject> page) {
        List<LostObjectResponse> content = page.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<LostObjectResponse>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }

    private LostObjectResponse toResponse(LostObject obj) {
        UserResponse userResponse = UserResponse.builder()
                .id(obj.getUser().getId())
                .name(obj.getUser().getName())
                .email(obj.getUser().getEmail())
                .role(obj.getUser().getRole().name())
                .phone(obj.getUser().getPhone())
                .location(obj.getUser().getLocation())
                .avatar(obj.getUser().getAvatar())
                .trustScore(obj.getUser().getTrustScore())
                .objectsFound(obj.getUser().getObjectsFound())
                .objectsLost(obj.getUser().getObjectsLost())
                .matches(obj.getUser().getMatches())
                .verified(obj.getUser().getVerified())
                .walletBalance(obj.getUser().getWalletBalance())
                .createdAt(obj.getUser().getCreatedAt())
                .build();

        return LostObjectResponse.builder()
                .id(obj.getId())
                .title(obj.getTitle())
                .description(obj.getDescription())
                .category(obj.getCategory())
                .location(obj.getLocation())
                .city(obj.getCity())
                .dateLost(obj.getDateLost())
                .image(obj.getImage())
                .images(obj.getImages())
                .status(obj.getStatus().name())
                .reward(obj.getReward())
                .views(obj.getViews())
                .user(userResponse)
                .createdAt(obj.getCreatedAt())
                .build();
    }
}
