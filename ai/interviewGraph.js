import {
    StateGraph,
    START,
    END,
    interrupt
} from "@langchain/langgraph";

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";

import { interviewState } from "./interviewState.js";
import { interviewLLM } from "../llm/model.js";
import { prisma } from "../database/db.js";


// ==================================================
// 1. GENERATE QUESTION
// ==================================================

const generateQuestion = async (state) => {

    console.log(
        `Generating question for interview ${state.interviewId}`
    );

    // --------------------------------------------------
    // Fetch previous questions to build the prompt
    // --------------------------------------------------

    const previousQuestions =
        await prisma.mockQuestion.findMany({
            where: { interviewId: state.interviewId },
            select: { question: true, order: true },
            orderBy: { order: "asc" }
        });

    const previousQuestionTexts =
        previousQuestions.map(q => q.question).join("\n- ");

    const prompt = `
You are an AI technical interviewer.

Candidate role:
${state.role}

Interview round:
${state.round}

Candidate experience:
${state.experience}

Interview context:
${state.description || "No additional context provided."}

Candidate resume:
${JSON.stringify(state.resume || {}, null, 2)}

Previously asked questions:
${previousQuestionTexts ? `- ${previousQuestionTexts}` : "None"}

Generate the next interview question.

Rules:
- Ask exactly ONE question.
- Do not provide the answer.
- Do not ask multiple questions.
- Do not repeat previous questions.
- Adapt difficulty to the candidate's experience.
- Use the candidate's resume when relevant.
- Keep the question relevant to the role.
- Keep the question relevant to the interview round.
- Return ONLY the question.
`;

    const response = await interviewLLM.invoke(prompt);

    const question =
        typeof response.content === "string"
            ? response.content.trim()
            : "";

    if (!question) {
        throw new Error("LLM generated an empty question.");
    }

    // --------------------------------------------------
    // Atomically compute `order` and insert the question.
    //
    // Wrapped in a transaction so that two concurrent
    // invocations cannot both pick the same order.
    // Retries on P2002 (unique constraint violation).
    // --------------------------------------------------

    const MAX_RETRIES = 5;
    let savedQuestion = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {

        try {

            savedQuestion = await prisma.$transaction(
                async (tx) => {

                    // Aggregate the max order atomically
                    const agg = await tx.mockQuestion.aggregate({
                        where: { interviewId: state.interviewId },
                        _max: { order: true }
                    });

                    const nextOrder = (agg._max.order || 0) + 1;

                    return tx.mockQuestion.create({
                        data: {
                            interviewId: state.interviewId,
                            question,
                            order: nextOrder
                        }
                    });
                },
                {
                    // Serializable isolation to prevent phantom reads
                    isolationLevel: "Serializable"
                }
            );

            break; // success

        } catch (err) {

            const isUniqueViolation =
                err?.code === "P2002";

            if (!isUniqueViolation) throw err;

            console.warn(
                `Order conflict on attempt ${attempt + 1} for interview ${state.interviewId}. Retrying...`
            );
        }
    }

    if (!savedQuestion) {
        throw new Error(
            "Failed to persist question after multiple retries."
        );
    }

    console.log(
        `Saved question #${savedQuestion.order} for interview ${state.interviewId}`
    );

    return {
        currentQuestion: question,
        currentQuestionId: savedQuestion.id,
        questionCount: savedQuestion.order,
        messages: [
            {
                role: "assistant",
                content: question
            }
        ]
    };
};


// ==================================================
// 2. WAIT FOR ANSWER
// ==================================================

const waitForAnswer = async (state) => {

    const answer = interrupt({
        type: "WAITING_FOR_ANSWER",
        question: state.currentQuestion,
        questionId: state.currentQuestionId
    });

    const cleanAnswer =
        typeof answer === "string"
            ? answer.trim()
            : "";

    if (!cleanAnswer) {
        throw new Error("Candidate answer cannot be empty.");
    }

    return {
        currentAnswer: cleanAnswer,
        messages: [
            {
                role: "user",
                content: cleanAnswer
            }
        ]
    };
};


// ==================================================
// 3. EVALUATE ANSWER
// ==================================================

const evaluateAnswer = async (state) => {

    const prompt = `
You are an expert technical interviewer.

Evaluate the candidate's answer.

Candidate role:
${state.role}

Interview round:
${state.round}

Question:
${state.currentQuestion}

Candidate answer:
${state.currentAnswer}

Evaluate based on:
1. Technical correctness
2. Depth of understanding
3. Relevance
4. Communication

Return exactly:

Score: <number from 0 to 10>
Feedback: <concise feedback>

Do not return anything else.
`;

    const response =
        await interviewLLM.invoke(prompt);

    const evaluation =
        typeof response.content === "string"
            ? response.content.trim()
            : "";

    if (!evaluation) {
        throw new Error("LLM generated empty evaluation.");
    }

    // --------------------------------------------------
    // Parse score + feedback
    // --------------------------------------------------

    const scoreMatch = evaluation.match(/Score:\s*([\d.]+)/i);
    const feedbackMatch = evaluation.match(/Feedback:\s*([\s\S]+)/i);

    const score = scoreMatch
        ? parseFloat(scoreMatch[1])
        : null;

    const feedback = feedbackMatch
        ? feedbackMatch[1].trim()
        : evaluation;

    // --------------------------------------------------
    // Persist answer + evaluation
    // --------------------------------------------------

    if (state.currentQuestionId) {

        await prisma.mockQuestion.update({
            where: { id: state.currentQuestionId },
            data: {
                answer: state.currentAnswer,
                feedback,
                score
            }
        });

        console.log(
            `Saved answer for question ${state.currentQuestionId}, score=${score}`
        );
    }

    return {
        evaluation,
        currentAnswer: null,
        currentQuestion: null,
        currentQuestionId: null
    };
};


// ==================================================
// 4. CHECK TIME
// ==================================================

const checkInterviewTime = async (state) => {

    if (!state.startedAt) {
        return {};
    }

    const startedAt = new Date(state.startedAt);
    const elapsed = Date.now() - startedAt.getTime();
    const durationMs = Number(state.duration) * 60 * 1000;
    const remaining = durationMs - elapsed;

    console.log(
        `Interview ${state.interviewId}: ` +
        `${Math.max(0, Math.floor(remaining / 1000))} seconds remaining`
    );

    if (remaining <= 0) {
        return { status: "COMPLETED" };
    }

    return {};
};


// ==================================================
// 5. ROUTER
// ==================================================

const routeAfterTimeCheck = (state) => {
    if (state.status === "COMPLETED") {
        return "finish";
    }
    return "nextQuestion";
};


// ==================================================
// 6. GRAPH
// ==================================================

const workflow =
    new StateGraph(interviewState)

        .addNode("generateQuestion", generateQuestion)
        .addNode("waitForAnswer", waitForAnswer)
        .addNode("evaluateAnswer", evaluateAnswer)
        .addNode("checkInterviewTime", checkInterviewTime)

        .addEdge(START, "generateQuestion")
        .addEdge("generateQuestion", "waitForAnswer")
        .addEdge("waitForAnswer", "evaluateAnswer")
        .addEdge("evaluateAnswer", "checkInterviewTime")

        .addConditionalEdges(
            "checkInterviewTime",
            routeAfterTimeCheck,
            {
                nextQuestion: "generateQuestion",
                finish: END
            }
        );


// ==================================================
// 7. POSTGRES CHECKPOINTER
// ==================================================

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error(
        "DATABASE_URL environment variable is required for PostgresSaver"
    );
}

// Create a connection pool (recommended for production)
const pool = new pg.Pool({
    connectionString: DATABASE_URL
});

const checkpointer = new PostgresSaver(pool, undefined, {
    schema: "public" // default schema
});

// setup() creates the checkpoint tables.
// Only needs to be called once per database.
let checkpointerReady = false;

export const initCheckpointer = async () => {
    if (!checkpointerReady) {
        await checkpointer.setup();
        checkpointerReady = true;
        console.log("PostgresSaver initialized");
    }
};


// ==================================================
// 8. EXPORT GRAPH
// ==================================================

export const interviewGraph =
    workflow.compile({ checkpointer });