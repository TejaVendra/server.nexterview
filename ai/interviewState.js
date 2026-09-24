import { Annotation } from "@langchain/langgraph";

export const interviewState = Annotation.Root({

    // ==========================================
    // Interview Information
    // ==========================================

    interviewId: Annotation(),

    role: Annotation(),

    round: Annotation(),

    experience: Annotation(),

    duration: Annotation(),

    startedAt: Annotation(),

    // ==========================================
    // Candidate Resume
    // ==========================================

    resume: Annotation(),

    // ==========================================
    // Current Question
    // ==========================================

    currentQuestion: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    // Database ID of current MockQuestion
    currentQuestionId: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    // ==========================================
    // Current Answer
    // ==========================================

    currentAnswer: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    // ==========================================
    // Current Evaluation
    // ==========================================

    evaluation: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    // ==========================================
    // Interview Status
    // ==========================================

    status: Annotation({
        reducer: (_, value) => value,
        default: () => "IN_PROGRESS"
    }),

    // ==========================================
    // Conversation History
    // ==========================================

    messages: Annotation({
        reducer: (previous, current) => [
            ...previous,
            ...current
        ],
        default: () => []
    })
});