import { Command } from "@langchain/langgraph";
import { interviewGraph } from "../ai/interviewGraph.js";

export const registerInterviewSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("start-interview", async ({ interviewId }) => {
            try {
                const initialState = {
                    interviewId,
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

                const config = {
                    configurable: {
                        thread_id: `interview:${interviewId}`
                    }
                };

                const result = await interviewGraph.invoke(
                    initialState,
                    config
                );

                if (result.__interrupt__) {
                    const questionData = result.__interrupt__[0].value;

                    socket.emit("interview-question", {
                        interviewId,
                        question: questionData.question
                    });
                }
            } catch (error) {
                console.error("Start interview error:", error);

                socket.emit("interview-error", {
                    message: "Failed to start interview."
                });
            }
        });

        socket.on("submit-answer", async ({ interviewId, answer }) => {
            try {
                if (!answer || !answer.trim()) {
                    socket.emit("interview-error", {
                        message: "Answer cannot be empty."
                    });

                    return;
                }

                const config = {
                    configurable: {
                        thread_id: `interview:${interviewId}`
                    }
                };

                const result = await interviewGraph.invoke(
                    new Command({
                        resume: answer
                    }),
                    config
                );

                if (result.__interrupt__) {
                    const questionData = result.__interrupt__[0].value;

                    socket.emit("interview-question", {
                        interviewId,
                        question: questionData.question
                    });
                } else {
                    socket.emit("interview-ended", {
                        interviewId,
                        message: "Interview completed."
                    });
                }
            } catch (error) {
                console.error("Submit answer error:", error);

                socket.emit("interview-error", {
                    message: "Failed to process answer."
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
};