import { interviewGraph } from "./ai/interviewGraph.js";
import { Command } from "@langchain/langgraph";

const config = {
    configurable: {
        thread_id: "interview:1"
    }
};

const initialState = {
    interviewId: 1,
    role: "Backend Developer",
    round: "Technical",
    experience: "Fresher",
    duration: 30,

    resume: {
        skills: [
            { name: "JavaScript" },
            { name: "Node.js" },
            { name: "Redis" }
        ],
        projects: [
            {
                name: "AI Mock Interview",
                description: "AI powered mock interview system"
            }
        ],
        experiences: []
    },

    currentQuestion: null,
    currentAnswer: null,
    evaluation: null,

    startedAt: new Date().toISOString(),

    status: "IN_PROGRESS",

    messages: []
};


// Start interview
const result = await interviewGraph.invoke(
    initialState,
    config
);

console.dir(result, { depth: null });


// Candidate answer
const answer = `
The Node.js event loop allows Node.js to perform non-blocking
I/O operations. JavaScript runs on a single thread, but Node.js
uses the event loop and underlying system APIs to handle
asynchronous operations such as file operations and network
requests. Once an asynchronous operation completes, its
callback is placed into the appropriate queue and the event
loop processes it when the call stack is available.
`;


// Resume interview
const result2 = await interviewGraph.invoke(
    new Command({
        resume: answer
    }),
    config
);

console.dir(result2, { depth: null });