package com.retrouvit.repository;

import com.retrouvit.entity.ObjectComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ObjectCommentRepository extends JpaRepository<ObjectComment, Long> {

    List<ObjectComment> findByLostObjectIdAndDeletedFalseOrderByCreatedAtAsc(Long lostObjectId);

    List<ObjectComment> findByFoundObjectIdAndDeletedFalseOrderByCreatedAtAsc(Long foundObjectId);

    int countByLostObjectIdAndDeletedFalse(Long lostObjectId);

    int countByFoundObjectIdAndDeletedFalse(Long foundObjectId);

    List<ObjectComment> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ObjectComment> findByParentIdAndDeletedFalseOrderByCreatedAtAsc(Long parentId);
}
