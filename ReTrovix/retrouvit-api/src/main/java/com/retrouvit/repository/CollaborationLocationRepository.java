package com.retrouvit.repository;

import com.retrouvit.entity.CollaborationLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CollaborationLocationRepository extends JpaRepository<CollaborationLocation, Long> {

    Optional<CollaborationLocation> findByReturnRequestIdAndUserId(Long returnRequestId, Long userId);

    /** Toutes les positions partagées d'une collaboration (vue admin §24). */
    List<CollaborationLocation> findByReturnRequestId(Long returnRequestId);

    /** §20 : purge du partage de position d'une collaboration (fin de mission). */
    @Modifying
    @Query("DELETE FROM CollaborationLocation c WHERE c.returnRequest.id = :returnRequestId")
    void deleteAllByReturnRequestId(@Param("returnRequestId") Long returnRequestId);
}
