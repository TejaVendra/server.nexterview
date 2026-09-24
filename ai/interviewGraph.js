import {
    StateGraph,
    START,
    END,
    interrupt,
    MemorySaver
} from "@langchain/langgraph";

import { interviewState } from "./interviewState.js";
import { interviewLLM } from "../llm/model.js";
import { prisma } from "../database/db.js";


// ==========================================
// 1. Generate Question
// ==========================================

const generateQuestion = async (state) => {

    console.log(
        `Generating question for interview ${state.interviewId}`
    );

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
${JSON.stringify(state.resume, null, 2)}

Previous conversation:
${JSON.stringify(state.messages, null, 2)}

Generate the next interview question.

Rules:

- Ask exactly ONE question.
- Do not provide the answer.
- Do not ask multiple questions.
- Do not repeat previous questions.
- Adapt the difficulty to the candidate's experience.
- Use the candidate's resume when relevant.
- Keep the question relevant to the interview role and round.
- Return only the interview question.
`;

    const response = await interviewLLM.invoke(prompt);

    const question = response.content.trim();

    if (!question) {
        throw new Error("LLM generated an empty question.");
    }

    // ==========================================
    // Find next question order
    // ==========================================

    const lastQuestion =
        await prisma.mockQuestion.findFirst({
            where: {
                interviewId: state.interviewId
            },
            orderBy: {
                order: "desc"
            }
        });

    const nextOrder =
        lastQuestion
            ? lastQuestion.order + 1
            : 1;

    // ==========================================
    // Save question to database
    // ==========================================

    const savedQuestion =
        await prisma.mockQuestion.create({
            data: {
                interviewId: state.interviewId,
                question,
                order: nextOrder
            }
        });

    console.log(
        `Question ${savedQuestion.id} created`
    );

    // ==========================================
    // Update LangGraph state
    // ==========================================

    return {
        currentQuestion: question,

        currentQuestionId: savedQuestion.id,

        messages: [
            {
                role: "assistant",
                content: question
            }
        ]
    };
};


// ==========================================
// 2. Wait For Candidate Answer
// ==========================================

const waitForAnswer = async (state) => {

    const answer = interrupt({
        type: "WAITING_FOR_ANSWER",

        question: state.currentQuestion,

        questionId: state.currentQuestionId
    });

    if (!answer || !answer.trim()) {
        throw new Error(
            "Candidate answer cannot be empty."
        );
    }

    const cleanAnswer = answer.trim();

    // ==========================================
    // Save answer to current question
    // ==========================================

    await prisma.mockQuestion.update({
        where: {
            id: state.currentQuestionId
        },

        data: {
            answer: cleanAnswer
        }
    });

    console.log(
        `Answer saved for question ${state.currentQuestionId}`
    );

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


// ==========================================
// 3. Evaluate Candidate Answer
// ==========================================

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

Evaluate the answer based on:

1. Technical correctness
2. Depth of understanding
3. Relevance
4. Communication

Return exactly this format:

Score: <number from 0 to 10>
Feedback: <concise feedback>

Do not provide any other format.
`;

    const response =
        await interviewLLM.invoke(prompt);

    const evaluation =
        response.content.trim();

    // ==========================================
    // Extract score
    // ==========================================

    let score = null;

    const scoreMatch =
        evaluation.match(
            /Score:\s*(\d+(?:\.\d+)?)/i
        );

    if (scoreMatch) {
        score = Number(scoreMatch[1]);
    }

    // ==========================================
    // Save evaluation
    // ==========================================

    await prisma.mockQuestion.update({
        where: {
            id: state.currentQuestionId
        },

        data: {
            feedback: evaluation,
            score
        }
    });

    console.log(
        `Evaluation saved for question ${state.currentQuestionId}`
    );

    return {
        evaluation
    };
};


// ==========================================
// 4. Check Interview Time
// ==========================================

const checkInterviewTime = async (state) => {

    const startedAt =
        new Date(state.startedAt);

    const elapsedTime =
        Date.now() - startedAt.getTime();

    const durationMs =
        state.duration * 60 * 1000;

    const remainingTime =
        durationMs - elapsedTime;

    console.log(
        `Interview ${state.interviewId}: ` +
        `${Math.max(
            0,
            Math.floor(remainingTime / 1000)
        )} seconds remaining`
    );

    if (remainingTime <= 0) {

        return {
            status: "COMPLETED"
        };
    }

    return {};
};


// ==========================================
// 5. Routing After Time Check
// ==========================================

const routeAfterTimeCheck = (state) => {

    if (state.status === "COMPLETED") {
        return "finish";
    }

    return "nextQuestion";
};


// ==========================================
// Build Graph
// ==========================================

const workflow =
    new StateGraph(interviewState)

        .addNode(
            "generateQuestion",
            generateQuestion
        )

        .addNode(
            "waitForAnswer",
            waitForAnswer
        )

        .addNode(
            "evaluateAnswer",
            evaluateAnswer
        )

        .addNode(
            "checkInterviewTime",
            checkInterviewTime
        )

        .addEdge(
            START,
            "generateQuestion"
        )

        .addEdge(
            "generateQuestion",
            "waitForAnswer"
        )

        .addEdge(
            "waitForAnswer",
            "evaluateAnswer"
        )

        .addEdge(
            "evaluateAnswer",
            "checkInterviewTime"
        )

        .addConditionalEdges(
            "checkInterviewTime",

            routeAfterTimeCheck,

            {
                nextQuestion:
                    "generateQuestion",

                finish:
                    END
            }
        );


// ==========================================
// Checkpointer
// ==========================================

const checkpointer =
    new MemorySaver();


// ==========================================
// Compile Graph
// ==========================================

export const interviewGraph =
    workflow.compile({
        checkpointer
    });