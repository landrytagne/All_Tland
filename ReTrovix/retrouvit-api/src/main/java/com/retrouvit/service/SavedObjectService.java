package com.retrouvit.service;

import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SavedObjectService {

    private final SavedObjectRepository savedObjectRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final UserRepository userRepository;

    public Map<String, Object> getStatus(Long userId, String objectType, Long objectId) {
        boolean saved;
        if ("lost".equals(objectType)) {
            saved = savedObjectRepository.existsByUserIdAndLostObjectId(userId, objectId);
        } else {
            saved = savedObjectRepository.existsByUserIdAndFoundObjectId(userId, objectId);
        }
        return Map.of("saved", saved);
    }

    @Transactional
    public Map<String, Object> toggle(Long userId, String objectType, Long objectId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean nowSaved;

        if ("lost".equals(objectType)) {
            var existing = savedObjectRepository.findByUserIdAndLostObjectId(userId, objectId);
            if (existing.isPresent()) {
                savedObjectRepository.deleteByUserIdAndLostObjectId(userId, objectId);
                nowSaved = false;
            } else {
                LostObject lostObject = lostObjectRepository.findById(objectId)
                        .orElseThrow(() -> new ResourceNotFoundException("Lost object not found"));
                savedObjectRepository.save(SavedObject.builder()
                        .user(user)
                        .lostObject(lostObject)
                        .build());
                nowSaved = true;
            }
        } else {
            var existing = savedObjectRepository.findByUserIdAndFoundObjectId(userId, objectId);
            if (existing.isPresent()) {
                savedObjectRepository.deleteByUserIdAndFoundObjectId(userId, objectId);
                nowSaved = false;
            } else {
                FoundObject foundObject = foundObjectRepository.findById(objectId)
                        .orElseThrow(() -> new ResourceNotFoundException("Found object not found"));
                savedObjectRepository.save(SavedObject.builder()
                        .user(user)
                        .foundObject(foundObject)
                        .build());
                nowSaved = true;
            }
        }

        return Map.of("saved", nowSaved);
    }

    public int getCount(Long userId) {
        return savedObjectRepository.countByUserId(userId);
    }
}
