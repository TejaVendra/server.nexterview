import { Annotation } from "@langchain/langgraph";

export const interviewState = Annotation.Root({

    interviewId: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    role: Annotation({
        reducer: (_, value) => value,
        default: () => ""
    }),

    round: Annotation({
        reducer: (_, value) => value,
        default: () => ""
    }),

    experience: Annotation({
        reducer: (_, value) => value,
        default: () => ""
    }),

    description: Annotation({
        reducer: (_, value) => value,
        default: () => ""
    }),

    duration: Annotation({
        reducer: (_, value) => value,
        default: () => 0
    }),

    startedAt: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    resume: Annotation({
        reducer: (_, value) => value,
        default: () => ({})
    }),

    currentQuestion: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    currentQuestionId: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    currentAnswer: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    evaluation: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    status: Annotation({
        reducer: (_, value) => value,
        default: () => "IN_PROGRESS"
    }),

    llmError: Annotation({
        reducer: (_, value) => value,
        default: () => null
    }),

    questionCount: Annotation({
        reducer: (_, value) => value,
        default: () => 0
    }),

    messages: Annotation({
        reducer: (previous, current) => {
            if (!current) return previous;
            return [...(previous || []), ...current];
        },
        default: () => []
    })
});