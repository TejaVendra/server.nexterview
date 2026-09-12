import { StateSchema , MessagesValue } from "@langchain/langgraph";
import * as z from 'zod';

export const interviewState = new StateSchema({
    interviewId:z.number(),

    role:z.string(),

    round: z.string(),

    experience: z.string(),

    duration: z.number(),

    resume: z.any().nullable(),

    currentQuestion: z.string().nullable(),

    currentAnswer: z.string().nullable(),

    evaluation: z.any().nullable(),

    startedAt: z.string(),

    status: z.enum([
        "CREATED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED"
    ]),

    messages: MessagesValue

});