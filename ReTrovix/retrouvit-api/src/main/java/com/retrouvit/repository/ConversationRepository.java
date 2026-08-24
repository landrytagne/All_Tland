package com.retrouvit.repository;

import com.retrouvit.entity.Conversation;
import com.retrouvit.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findByUser1OrUser2OrderByLastMessageAtDesc(User user1, User user2);

    Optional<Conversation> findByUser1AndUser2(User user1, User user2);
    Optional<Conversation> findByUser2AndUser1(User user1, User user2);

    default Optional<Conversation> findByUsers(User user1, User user2) {
        return findByUser1AndUser2(user1, user2)
                .or(() -> findByUser2AndUser1(user1, user2));
    }
}
