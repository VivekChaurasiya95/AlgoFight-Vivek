export interface DifficultyPointConfig {
    basePoints: number;
    saturationThreshold: number; // Max full-reward solves per period
    minFactor: number; // Minimum diminishing return factor
}

export const REWARD_CONFIG = {
    // Problem solving base values by difficulty
    DIFFICULTY_POINTS: {
        EASY: { basePoints: 10, saturationThreshold: 5, minFactor: 0.2 } as DifficultyPointConfig,
        MEDIUM: { basePoints: 25, saturationThreshold: 8, minFactor: 0.4 } as DifficultyPointConfig,
        HARD: { basePoints: 60, saturationThreshold: 12, minFactor: 0.6 } as DifficultyPointConfig,
        EXPERT: { basePoints: 120, saturationThreshold: 20, minFactor: 0.8 } as DifficultyPointConfig,
    } as Record<string, DifficultyPointConfig>,

    // Rated battle point parameters
    BATTLE: {
        BASE_WIN_REWARD: 50,
        BASE_LOSS_REWARD: 10,
        MAX_OPPONENT_STRENGTH_BONUS: 40,
        PERFORMANCE_WEIGHT: 0.4,
        ABANDONED_REWARD: 0,
    },

    // Weekly consistency rewards (Threshold in active days -> Arena Points)
    WEEKLY_CONSISTENCY: [
        { daysRequired: 3, rewardPoints: 10 },
        { daysRequired: 5, rewardPoints: 20 },
        { daysRequired: 7, rewardPoints: 30 },
    ],

    // One-time milestone achievements
    MILESTONES: [
        { key: "FIRST_RATED_WIN", title: "First Rated Victory", points: 50 },
        { key: "FIRST_MEDIUM_SOLVE", title: "First Medium Problem Solved", points: 30 },
        { key: "FIRST_HARD_SOLVE", title: "First Hard Problem Solved", points: 75 },
        { key: "FIRST_EXPERT_SOLVE", title: "First Expert Problem Solved", points: 150 },
        { key: "TEN_HARD_SOLVES", title: "Decathlon: 10 Hard Problems Solved", points: 200 },
        { key: "FIFTY_SOLVES", title: "Centurion: 50 Total Solves", points: 250 },
    ],

    // Anti-farming / Integrity modifiers
    INTEGRITY: {
        REPEATED_OPPONENT_PENALTY_THRESHOLD: 3, // Matches against same opponent within 24h
        REPEATED_OPPONENT_DECAY: 0.3, // Drop multiplier per match above threshold
        MIN_INTEGRITY_MULTIPLIER: 0.1,
    }
};
