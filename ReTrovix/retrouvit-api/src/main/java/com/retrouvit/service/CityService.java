package com.retrouvit.service;

import com.retrouvit.dto.CityResponse;
import com.retrouvit.entity.City;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.CityRepository;
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
public class CityService {

    private final CityRepository cityRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;

    /**
     * Get all cities with object counts.
     */
    public List<CityResponse> getAllCities() {
        return cityRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get only enabled cities.
     */
    public List<CityResponse> getEnabledCities() {
        return cityRepository.findByEnabledTrueOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get city by ID.
     */
    public CityResponse getCityById(Long id) {
        City city = cityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ville non trouvée"));
        return toResponse(city);
    }

    /**
     * Create a new city.
     */
    @Transactional
    public CityResponse createCity(String name, String region) {
        if (cityRepository.existsByName(name)) {
            throw new IllegalStateException("Une ville avec ce nom existe déjà");
        }

        City city = City.builder()
                .name(name)
                .region(region != null ? region : "Cameroun")
                .enabled(true)
                .build();

        City saved = cityRepository.save(city);
        log.info("City created: {}", saved.getName());
        return toResponse(saved);
    }

    /**
     * Update an existing city.
     */
    @Transactional
    public CityResponse updateCity(Long id, String name, String region, Boolean enabled) {
        City city = cityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ville non trouvée"));

        if (name != null && !name.equals(city.getName())) {
            if (cityRepository.existsByName(name)) {
                throw new IllegalStateException("Une ville avec ce nom existe déjà");
            }
            city.setName(name);
        }

        if (region != null) {
            city.setRegion(region);
        }

        if (enabled != null) {
            city.setEnabled(enabled);
        }

        City saved = cityRepository.save(city);
        log.info("City updated: {}", saved.getName());
        return toResponse(saved);
    }

    /**
     * Delete a city.
     */
    @Transactional
    public void deleteCity(Long id) {
        if (!cityRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ville non trouvée");
        }
        cityRepository.deleteById(id);
        log.info("City deleted: {}", id);
    }

    /**
     * Count objects in a city.
     */
    private long countObjectsInCity(String cityName) {
        long lostCount = lostObjectRepository.countByCity(cityName);
        long foundCount = foundObjectRepository.countByCity(cityName);
        return lostCount + foundCount;
    }

    private CityResponse toResponse(City city) {
        return CityResponse.builder()
                .id(city.getId())
                .name(city.getName())
                .region(city.getRegion())
                .enabled(city.getEnabled())
                .objectCount(countObjectsInCity(city.getName()))
                .createdAt(city.getCreatedAt())
                .build();
    }
}
