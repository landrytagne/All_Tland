package com.retrouvit.service;

import com.retrouvit.dto.*;
import com.retrouvit.entity.*;
import com.retrouvit.exception.ResourceNotFoundException;
import com.retrouvit.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ObjectInteractionService {

    private final ObjectLikeRepository likeRepository;
    private final ObjectCommentRepository commentRepository;
    private final LostObjectRepository lostObjectRepository;
    private final FoundObjectRepository foundObjectRepository;
    private final UserRepository userRepository;

    // ─── Likes ──────────────────────────────────────────────────────

    public InteractionResponse getInteractions(Long userId, String objectType, Long objectId) {
        boolean liked;
        int likeCount;
        int commentCount;

        if ("lost".equals(objectType)) {
            liked = userId != null && likeRepository.existsByUserIdAndLostObjectId(userId, objectId);
            likeCount = likeRepository.countByLostObjectId(objectId);
            commentCount = commentRepository.countByLostObjectIdAndDeletedFalse(objectId);
        } else {
            liked = userId != null && likeRepository.existsByUserIdAndFoundObjectId(userId, objectId);
            likeCount = likeRepository.countByFoundObjectId(objectId);
            commentCount = commentRepository.countByFoundObjectIdAndDeletedFalse(objectId);
        }

        return InteractionResponse.builder()
                .likeCount(likeCount)
                .liked(liked)
                .commentCount(commentCount)
                .build();
    }

    @Transactional
    public InteractionResponse toggleLike(Long userId, String objectType, Long objectId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if ("lost".equals(objectType)) {
            LostObject lostObject = lostObjectRepository.findById(objectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Lost object not found"));

            var existing = likeRepository.findByUserIdAndLostObjectId(userId, objectId);
            if (existing.isPresent()) {
                likeRepository.deleteByUserIdAndLostObjectId(userId, objectId);
            } else {
                likeRepository.save(ObjectLike.builder()
                        .user(user)
                        .lostObject(lostObject)
                        .build());
            }

            return InteractionResponse.builder()
                    .likeCount(likeRepository.countByLostObjectId(objectId))
                    .liked(!existing.isPresent())
                    .commentCount(commentRepository.countByLostObjectIdAndDeletedFalse(objectId))
                    .build();
        } else {
            FoundObject foundObject = foundObjectRepository.findById(objectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Found object not found"));

            var existing = likeRepository.findByUserIdAndFoundObjectId(userId, objectId);
            if (existing.isPresent()) {
                likeRepository.deleteByUserIdAndFoundObjectId(userId, objectId);
            } else {
                likeRepository.save(ObjectLike.builder()
                        .user(user)
                        .foundObject(foundObject)
                        .build());
            }

            return InteractionResponse.builder()
                    .likeCount(likeRepository.countByFoundObjectId(objectId))
                    .liked(!existing.isPresent())
                    .commentCount(commentRepository.countByFoundObjectIdAndDeletedFalse(objectId))
                    .build();
        }
    }

    // ─── Comments ───────────────────────────────────────────────────

    public List<CommentResponse> getComments(String objectType, Long objectId) {
        List<ObjectComment> comments;

        if ("lost".equals(objectType)) {
            comments = commentRepository.findByLostObjectIdAndDeletedFalseOrderByCreatedAtAsc(objectId);
        } else {
            comments = commentRepository.findByFoundObjectIdAndDeletedFalseOrderByCreatedAtAsc(objectId);
        }

        // Build tree: top-level comments with nested replies
        Map<Long, List<ObjectComment>> byParent = comments.stream()
                .filter(c -> c.getParent() != null)
                .collect(Collectors.groupingBy(c -> c.getParent().getId()));

        List<CommentResponse> result = new ArrayList<>();
        for (ObjectComment comment : comments) {
            if (comment.getParent() == null) {
                result.add(toResponse(comment, byParent));
            }
        }
        return result;
    }

    @Transactional
    public CommentResponse addComment(Long userId, CommentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ObjectComment comment = ObjectComment.builder()
                .content(request.getContent())
                .user(user)
                .build();

        if (request.getLostObjectId() != null) {
            LostObject lostObject = lostObjectRepository.findById(request.getLostObjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lost object not found"));
            comment.setLostObject(lostObject);
        }

        if (request.getFoundObjectId() != null) {
            FoundObject foundObject = foundObjectRepository.findById(request.getFoundObjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Found object not found"));
            comment.setFoundObject(foundObject);
        }

        if (request.getParentId() != null) {
            ObjectComment parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found"));
            comment.setParent(parent);
        }

        ObjectComment saved = commentRepository.save(comment);
        return toResponse(saved, Map.of());
    }

    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        ObjectComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!comment.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only delete your own comments");
        }

        // Soft delete: mark as deleted, show "Commentaire supprimé"
        comment.setDeleted(true);
        comment.setContent("Ce commentaire a été supprimé.");
        commentRepository.save(comment);
    }

    // ─── Mapping ────────────────────────────────────────────────────

    private CommentResponse toResponse(ObjectComment comment, Map<Long, List<ObjectComment>> byParent) {
        List<CommentResponse> replies = new ArrayList<>();
        List<ObjectComment> childComments = byParent.getOrDefault(comment.getId(), List.of());
        for (ObjectComment child : childComments) {
            if (Boolean.TRUE.equals(child.getDeleted())) continue;
            replies.add(toResponse(child, byParent));
        }

        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .user(toUserResponse(comment.getUser()))
                .lostObjectId(comment.getLostObject() != null ? comment.getLostObject().getId() : null)
                .foundObjectId(comment.getFoundObject() != null ? comment.getFoundObject().getId() : null)
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .deleted(comment.getDeleted())
                .replies(replies)
                .replyCount(replies.size())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .location(user.getLocation())
                .trustScore(user.getTrustScore())
                .verified(user.getVerified())
                .build();
    }
}
