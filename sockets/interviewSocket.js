import { Command } from "@langchain/langgraph";

import { interviewGraph } from "../ai/interviewGraph.js";

import { prisma } from "../database/db.js";


// ==========================================
// Socket Registration
// ==========================================

export const registerInterviewSocket = (io) => {

    io.on("connection", (socket) => {

        console.log(
            "Client connected:",
            socket.id
        );


        // ==========================================
        // START INTERVIEW
        // ==========================================

        socket.on(
            "start-interview",
            async ({ interviewId }) => {

                try {

                    console.log(
                        "Starting interview:",
                        interviewId
                    );


                    // ==========================================
                    // Validate interview ID
                    // ==========================================

                    const id = Number(interviewId);

                    if (!Number.isInteger(id)) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Invalid interview ID."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // Get Interview + Resume
                    // ==========================================

                    const interview =
                        await prisma.mockInterview.findUnique({

                            where: {
                                id
                            },

                            include: {

                                user: {

                                    include: {

                                        resume: {

                                            include: {

                                                skills: true,

                                                experiences: true,

                                                educations: true,

                                                projects: {
                                                    include: {
                                                        technologies:
                                                            true
                                                    }
                                                },

                                                certifications:
                                                    true
                                            }
                                        }
                                    }
                                }
                            }
                        });


                    // ==========================================
                    // Interview not found
                    // ==========================================

                    if (!interview) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Interview not found."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // Already completed
                    // ==========================================

                    if (
                        interview.status ===
                        "COMPLETED"
                    ) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Interview is already completed."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // Already in progress
                    // ==========================================

                    if (
                        interview.status ===
                        "IN_PROGRESS"
                    ) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Interview is already in progress."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // Start Interview
                    // ==========================================

                    const startedAt =
                        new Date();


                    await prisma.mockInterview.update({

                        where: {
                            id
                        },

                        data: {

                            status:
                                "IN_PROGRESS",

                            startedAt
                        }
                    });


                    // ==========================================
                    // Resume
                    // ==========================================

                    const resume =
                        interview.user.resume || null;


                    // ==========================================
                    // LangGraph Config
                    // ==========================================

                    const config = {

                        configurable: {

                            thread_id:
                                `interview:${id}`
                        }
                    };


                    // ==========================================
                    // Initial LangGraph State
                    // ==========================================

                    const initialState = {

                        interviewId:
                            interview.id,

                        role:
                            interview.role,

                        round:
                            interview.round,

                        experience:
                            interview.experience,

                        duration:
                            interview.duration,

                        description:
                            interview.description,

                        startedAt:
                            startedAt.toISOString(),

                        resume,

                        currentQuestion:
                            null,

                        currentQuestionId:
                            null,

                        currentAnswer:
                            null,

                        evaluation:
                            null,

                        status:
                            "IN_PROGRESS",

                        messages:
                            []
                    };


                    // ==========================================
                    // Start LangGraph
                    // ==========================================

                    const result =
                        await interviewGraph.invoke(
                            initialState,
                            config
                        );


                    // ==========================================
                    // Graph paused at interrupt
                    // ==========================================

                    if (
                        result.__interrupt__
                    ) {

                        const questionData =
                            result
                                .__interrupt__[0]
                                .value;


                        socket.emit(
                            "interview-question",
                            {

                                interviewId:
                                    id,

                                question:
                                    questionData.question,

                                questionId:
                                    questionData.questionId
                            }
                        );

                    }

                } catch (error) {

                    console.error(
                        "Start interview error:",
                        error
                    );


                    socket.emit(
                        "interview-error",
                        {
                            message:
                                "Failed to start interview."
                        }
                    );
                }
            }
        );


        // ==========================================
        // SUBMIT ANSWER
        // ==========================================

        socket.on(
            "submit-answer",
            async ({
                interviewId,
                answer
            }) => {

                try {

                    // ==========================================
                    // Validate answer
                    // ==========================================

                    if (
                        !answer ||
                        !answer.trim()
                    ) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Answer cannot be empty."
                            }
                        );

                        return;
                    }


                    const id =
                        Number(interviewId);


                    if (!Number.isInteger(id)) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Invalid interview ID."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // Check Interview
                    // ==========================================

                    const interview =
                        await prisma.mockInterview.findUnique({

                            where: {
                                id
                            }
                        });


                    if (!interview) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Interview not found."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // Check Status
                    // ==========================================

                    if (
                        interview.status !==
                        "IN_PROGRESS"
                    ) {

                        socket.emit(
                            "interview-error",
                            {
                                message:
                                    "Interview is not active."
                            }
                        );

                        return;
                    }


                    // ==========================================
                    // LangGraph Config
                    // ==========================================

                    const config = {

                        configurable: {

                            thread_id:
                                `interview:${id}`
                        }
                    };


                    // ==========================================
                    // Resume LangGraph
                    // ==========================================

                    const result =
                        await interviewGraph.invoke(

                            new Command({
                                resume:
                                    answer.trim()
                            }),

                            config
                        );


                    // ==========================================
                    // Graph paused again
                    // ==========================================

                    if (
                        result.__interrupt__
                    ) {

                        const questionData =
                            result
                                .__interrupt__[0]
                                .value;


                        socket.emit(
                            "interview-question",
                            {

                                interviewId:
                                    id,

                                question:
                                    questionData.question,

                                questionId:
                                    questionData.questionId
                            }
                        );

                    }


                    // ==========================================
                    // Interview completed
                    // ==========================================

                    else {

                        await prisma.mockInterview.update({

                            where: {
                                id
                            },

                            data: {

                                status:
                                    "COMPLETED",

                                completedAt:
                                    new Date()
                            }
                        });


                        socket.emit(
                            "interview-ended",
                            {

                                interviewId:
                                    id,

                                message:
                                    "Interview completed."
                            }
                        );
                    }

                } catch (error) {

                    console.error(
                        "Submit answer error:",
                        error
                    );


                    socket.emit(
                        "interview-error",
                        {
                            message:
                                "Failed to process answer."
                        }
                    );
                }
            }
        );


        // ==========================================
        // DISCONNECT
        // ==========================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Client disconnected:",
                    socket.id
                );
            }
        );
    });
};