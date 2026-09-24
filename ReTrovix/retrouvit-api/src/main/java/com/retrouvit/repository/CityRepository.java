package com.retrouvit.repository;

import com.retrouvit.entity.City;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CityRepository extends JpaRepository<City, Long> {
    Optional<City> findByName(String name);
    boolean existsByName(String name);
    List<City> findByEnabledTrueOrderByNameAsc();
    List<City> findAllByOrderByNameAsc();
}
