package com.retrouvit.service;

import com.retrouvit.dto.*;
import com.retrouvit.entity.FoundObject;
import com.retrouvit.entity.ObjectStatus;
import com.retrouvit.entity.User;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.FoundObjectRepository;
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
public class FoundObjectService {

    private final FoundObjectRepository foundObjectRepository;
    private final UserRepository userRepository;

    public FoundObjectResponse create(FoundObjectRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));

        FoundObject foundObject = FoundObject.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .location(request.getLocation())
                .city(request.getCity())
                .dateFound(request.getDateFound() != null ? request.getDateFound() : LocalDate.now())
                .image(request.getImage())
                .images(request.getImages())
                .user(user)
                .build();

        FoundObject saved = foundObjectRepository.save(foundObject);
        user.setObjectsFound(user.getObjectsFound() + 1);
        userRepository.save(user);

        return toResponse(saved);
    }

    public FoundObjectResponse getById(Long id) {
        FoundObject foundObject = foundObjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objet trouvé non trouvé"));
        foundObject.setViews(foundObject.getViews() + 1);
        foundObjectRepository.save(foundObject);
        return toResponse(foundObject);
    }

    public PageResponse<FoundObjectResponse> getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FoundObject> pageResult = foundObjectRepository.findAllActive(pageable);
        return toPageResponse(pageResult);
    }

    public PageResponse<FoundObjectResponse> getByUserId(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FoundObject> pageResult = foundObjectRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return toPageResponse(pageResult);
    }

    public PageResponse<FoundObjectResponse> getByCategory(String category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FoundObject> pageResult = foundObjectRepository.findByCategoryAndStatusOrderByCreatedAtDesc(category, ObjectStatus.ACTIVE, pageable);
        return toPageResponse(pageResult);
    }

    public PageResponse<FoundObjectResponse> getByCity(String city, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FoundObject> pageResult = foundObjectRepository.findByCityAndStatusOrderByCreatedAtDesc(city, ObjectStatus.ACTIVE, pageable);
        return toPageResponse(pageResult);
    }

    // Non-paginated (used by MatchingEngine)
    public List<FoundObjectResponse> getAll() {
        return foundObjectRepository.findAllActive().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<FoundObjectResponse> getByUserId(Long userId) {
        return foundObjectRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FoundObjectResponse update(Long id, FoundObjectRequest request, Long userId) {
        FoundObject foundObject = foundObjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objet trouvé non trouvé"));

        if (!foundObject.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Vous ne pouvez modifier que vos propres annonces");
        }

        if (request.getTitle() != null) foundObject.setTitle(request.getTitle());
        if (request.getDescription() != null) foundObject.setDescription(request.getDescription());
        if (request.getCategory() != null) foundObject.setCategory(request.getCategory());
        if (request.getLocation() != null) foundObject.setLocation(request.getLocation());
        if (request.getCity() != null) foundObject.setCity(request.getCity());
        if (request.getDateFound() != null) foundObject.setDateFound(request.getDateFound());
        if (request.getImage() != null) foundObject.setImage(request.getImage());
        if (request.getImages() != null) foundObject.setImages(request.getImages());

        FoundObject updated = foundObjectRepository.save(foundObject);
        return toResponse(updated);
    }

    public void delete(Long id, Long userId) {
        FoundObject foundObject = foundObjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Objet trouvé non trouvé"));

        if (!foundObject.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Vous ne pouvez supprimer que vos propres annonces");
        }

        foundObjectRepository.deleteById(id);
    }

    private PageResponse<FoundObjectResponse> toPageResponse(Page<FoundObject> page) {
        List<FoundObjectResponse> content = page.getContent().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        return PageResponse.<FoundObjectResponse>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }

    private FoundObjectResponse toResponse(FoundObject obj) {
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

        return FoundObjectResponse.builder()
                .id(obj.getId())
                .title(obj.getTitle())
                .description(obj.getDescription())
                .category(obj.getCategory())
                .location(obj.getLocation())
                .city(obj.getCity())
                .dateFound(obj.getDateFound())
                .image(obj.getImage())
                .images(obj.getImages())
                .status(obj.getStatus().name())
                .views(obj.getViews())
                .user(userResponse)
                .createdAt(obj.getCreatedAt())
                .build();
    }
}
