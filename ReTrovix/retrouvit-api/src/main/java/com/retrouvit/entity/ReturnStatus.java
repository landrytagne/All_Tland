package com.retrouvit.entity;

public enum ReturnStatus {
    CHAT_INITIATED,       // Finder started chat with loser
    REWARD_PROPOSED,      // Loser proposed reward amount
    REWARD_ACCEPTED,      // Finder accepted the reward
    BOTH_VALIDATED,       // Both parties validated collaboration
    APPOINTMENT_SET,      // Meeting date/time/location set
    RETURN_IN_PROGRESS,   // Finder is on the way / meeting happened
    RETURN_CONFIRMED,     // Both confirmed the item was returned
    PAYMENT_COMPLETED,    // Payment sent to finder (minus 15%)
    DISPUTED,             // One party filed a dispute
    DISPUTE_RESOLVED      // Dispute has been resolved
}
