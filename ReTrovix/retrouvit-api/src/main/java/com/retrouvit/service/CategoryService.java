package com.retrouvit.service;

import com.retrouvit.dto.CategoryResponse;
import com.retrouvit.entity.Category;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.CategoryRepository;
import com.retrouvit.repository.LostObjectRepository;
import com.retrouvit.repository.FoundObjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;

    /**
     * Get all categories with object counts.
     */
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get only enabled categories.
     */
    public List<CategoryResponse> getEnabledCategories() {
        return categoryRepository.findByEnabledTrueOrderBySortOrderAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get category by ID.
     */
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catégorie non trouvée"));
        return toResponse(category);
    }

    /**
     * Create a new category.
     */
    @Transactional
    public CategoryResponse createCategory(String name, String icon) {
        if (categoryRepository.existsByName(name)) {
            throw new IllegalStateException("Une catégorie avec ce nom existe déjà");
        }

        Category category = Category.builder()
                .name(name)
                .icon(icon != null ? icon : "Package")
                .sortOrder(categoryRepository.findAllByOrderBySortOrderAsc().size())
                .enabled(true)
                .build();

        Category saved = categoryRepository.save(category);
        log.info("Category created: {}", saved.getName());
        return toResponse(saved);
    }

    /**
     * Update an existing category.
     */
    @Transactional
    public CategoryResponse updateCategory(Long id, String name, String icon, Boolean enabled) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Catégorie non trouvée"));

        if (name != null && !name.equals(category.getName())) {
            if (categoryRepository.existsByName(name)) {
                throw new IllegalStateException("Une catégorie avec ce nom existe déjà");
            }
            category.setName(name);
        }

        if (icon != null) {
            category.setIcon(icon);
        }

        if (enabled != null) {
            category.setEnabled(enabled);
        }

        Category saved = categoryRepository.save(category);
        log.info("Category updated: {}", saved.getName());
        return toResponse(saved);
    }

    /**
     * Delete a category.
     */
    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Catégorie non trouvée");
        }
        categoryRepository.deleteById(id);
        log.info("Category deleted: {}", id);
    }

    /**
     * Count objects in a category.
     */
    private long countObjectsInCategory(String categoryName) {
        long lostCount = lostObjectRepository.countByCategory(categoryName);
        long foundCount = foundObjectRepository.countByCategory(categoryName);
        return lostCount + foundCount;
    }

    private CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .icon(category.getIcon())
                .sortOrder(category.getSortOrder())
                .enabled(category.getEnabled())
                .objectCount(countObjectsInCategory(category.getName()))
                .createdAt(category.getCreatedAt())
                .build();
    }
}
