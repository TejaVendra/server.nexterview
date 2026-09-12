import { StateGraph,START,END ,interrupt, MemorySaver} from "@langchain/langgraph";

import { interviewState } from "./interviewState.js";
import { interviewLLM } from "../llm/model.js";


const generateQuestion = async (state) => {
    const prompt = `
            You are an AI technical interviewer.

            Candidate role: ${state.role}
            Interview round: ${state.round}
            Experience: ${state.experience}

            Candidate resume:
            ${JSON.stringify(state.resume)}

            Previous conversation:
            ${JSON.stringify(state.messages)}

            Generate the next interview question.

            Rules:
            - Ask exactly one question.
            - Do not provide the answer.
            - Do not repeat previous questions.
            - Adapt the difficulty to the candidate's experience.
            - Use the candidate's resume when relevant.
            `;

                const response = await interviewLLM.invoke(prompt);

                const question = response.content;

                return {
                    currentQuestion: question,

                    messages: [
                        {
                            role: "assistant",
                            content: question
                        }
                    ]
                };
};

const waitForAnswer = async (state) => {
    const answer = interrupt({
        type: "WAITING_FOR_ANSWER",
        question: state.currentQuestion
    });

    return {
        currentAnswer: answer,

        messages: [
            {
                role: "user",
                content: answer
            }
        ]
    };
};
const evaluateAnswer = async (state) => {

    const prompt = `
            You are an expert technical interviewer.

            Evaluate the candidate's answer.

            Role:
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

            Give concise feedback and a score from 0 to 10.
            `;

                const response = await interviewLLM.invoke(prompt);

                return {
                    evaluation: response.content
                };
            };

    
const checkInterviewTime = async (state) => {

        const startedAt = new Date(state.startedAt);

        const elapsedTime =
            Date.now() - startedAt.getTime();

        const durationMs =
            state.duration * 60 * 1000;

        const remainingTime =
            durationMs - elapsedTime;

        console.log(
            `Interview ${state.interviewId} has ${Math.max(
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

const routeAfterTimeCheck = (state) => {

    if (state.status === "COMPLETED") {
        return "finish";
    }

    return "nextQuestion";
};

const workflow = new StateGraph(interviewState)

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
            nextQuestion: "generateQuestion",
            finish: END
        }
    );

const checkpointer = new MemorySaver();

export const interviewGraph =
    workflow.compile({
        checkpointer
    });