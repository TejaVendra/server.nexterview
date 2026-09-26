import { Command } from "@langchain/langgraph";
import { interviewGraph } from "../ai/interviewGraph.js";
import { prisma } from "../database/db.js";


// Prevent concurrent graph invocations per interview
const graphLocks = new Map(); // interviewId -> Promise

const withGraphLock = async (interviewId, fn) => {
    const key = String(interviewId);

    // Wait for any in-flight graph to finish first
    if (graphLocks.has(key)) {
        console.log(`[lock] Graph already running for interview ${key}, waiting...`);
        try {
            await graphLocks.get(key);
        } catch {
            // ignore previous failure
        }
    }

    const promise = (async () => {
        try {
            return await fn();
        } finally {
            // Only delete if we're still the current lock holder
            if (graphLocks.get(key) === promise) {
                graphLocks.delete(key);
            }
        }
    })();

    graphLocks.set(key, promise);
    return promise;
};
// ============================================================
// GET REMAINING TIME
// ============================================================

const getRemainingSeconds = (interview) => {

    const durationSeconds = Number(interview.duration) * 60;
    let elapsedSeconds = Number(interview.elapsedSeconds || 0);

    if (interview.status === "IN_PROGRESS" && interview.startedAt) {
        const runningSeconds = Math.floor(
            (Date.now() - new Date(interview.startedAt).getTime()) / 1000
        );
        elapsedSeconds += Math.max(0, runningSeconds);
    }

    return Math.max(0, durationSeconds - elapsedSeconds);
};


// ============================================================
// CALCULATE CURRENT ELAPSED TIME
// ============================================================

const getCurrentElapsedSeconds = (interview) => {

    let elapsedSeconds = Number(interview.elapsedSeconds || 0);

    if (interview.status === "IN_PROGRESS" && interview.startedAt) {
        const runningSeconds = Math.floor(
            (Date.now() - new Date(interview.startedAt).getTime()) / 1000
        );
        elapsedSeconds += Math.max(0, runningSeconds);
    }

    return elapsedSeconds;
};


// ============================================================
// GET RESUME
// ============================================================

const getCandidateResume = async (userId) => {
    const resume = await prisma.resume.findUnique({
        where: { userId },
        include: {
            skills: true,
            experiences: true,
            educations: true,
            projects: { include: { technologies: true } },
            certifications: true
        }
    });
    return resume || {};
};


// ============================================================
// GET ALL QUESTIONS
// ============================================================

const getInterviewQuestions = async (interviewId) => {
    return prisma.mockQuestion.findMany({
        where: { interviewId },
        orderBy: { order: "asc" }
    });
};


// ============================================================
// GET CURRENT UNANSWERED QUESTION
// ============================================================

const getCurrentQuestion = async (interviewId) => {
    return prisma.mockQuestion.findFirst({
        where: { interviewId, answer: null },
        orderBy: { order: "asc" }
    });
};


// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview = async (interviewId) => {

    const interview = await prisma.mockInterview.findUnique({
        where: { id: interviewId }
    });

    if (!interview) return null;
    if (interview.status === "COMPLETED") return interview;

    const elapsedSeconds = getCurrentElapsedSeconds(interview);

    const questions = await prisma.mockQuestion.findMany({
        where: { interviewId }
    });

    const scoredQuestions = questions.filter(
        q => typeof q.score === "number"
    );

    const overallScore =
        scoredQuestions.length > 0
            ? scoredQuestions.reduce((sum, q) => sum + q.score, 0) /
              scoredQuestions.length
            : null;

    return prisma.mockInterview.update({
        where: { id: interviewId },
        data: {
            status: "COMPLETED",
            elapsedSeconds,
            completedAt: new Date(),
            score: overallScore
        }
    });
};


// ============================================================
// PAUSE INTERVIEW
// ============================================================

const pauseInterview = async (interviewId) => {

    const interview = await prisma.mockInterview.findUnique({
        where: { id: interviewId }
    });

    if (!interview) return null;
    if (interview.status !== "IN_PROGRESS") return interview;

    const now = new Date();
    const elapsedSeconds = getCurrentElapsedSeconds(interview);

    return prisma.mockInterview.update({
        where: { id: interviewId },
        data: {
            status: "PAUSED",
            elapsedSeconds,
            pausedAt: now,
            startedAt: null
        }
    });
};


// ============================================================
// RESUME INTERVIEW
// ============================================================

const resumeInterview = async (interviewId) => {

    const interview = await prisma.mockInterview.findUnique({
        where: { id: interviewId }
    });

    if (!interview) return null;
    if (interview.status !== "PAUSED") return interview;

    const remainingSeconds = Math.max(
        0,
        interview.duration * 60 - interview.elapsedSeconds
    );

    if (remainingSeconds <= 0) {
        return completeInterview(interviewId);
    }

    return prisma.mockInterview.update({
        where: { id: interviewId },
        data: {
            status: "IN_PROGRESS",
            startedAt: new Date(),
            pausedAt: null
        }
    });
};


// ============================================================
// RUN GRAPH & EMIT NEXT QUESTION OR END
// ============================================================

const runGraphAndEmit = async (socket, interview, input, config) => {

    return withGraphLock(interview.id, async () => {

        let result;

        try {
            result = await interviewGraph.invoke(input, config);
        } catch (error) {

            const errorText = String(error?.message || error);

            const isRateLimit =
                errorText.includes("429") ||
                errorText.toLowerCase().includes("too many requests") ||
                errorText.toLowerCase().includes("resource exhausted");

            if (isRateLimit) {
                const paused = await pauseInterview(interview.id);

                socket.emit("llm-rate-limit", {
                    interviewId: interview.id,
                    message:
                        "The AI interviewer is temporarily unavailable because the AI service has reached its request limit. Your interview has been paused.",
                    remainingSeconds: paused
                        ? Math.max(
                            0,
                            paused.duration * 60 - paused.elapsedSeconds
                        )
                        : 0
                });

                return { rateLimited: true };
            }

            throw error;
        }

        // Graph interrupted => new question waiting for answer
        if (result.__interrupt__) {

            const questionData = result.__interrupt__[0].value;

            const latestInterview =
                await prisma.mockInterview.findUnique({
                    where: { id: interview.id }
                });

            socket.emit("interview-question", {
                interviewId: interview.id,
                question: questionData.question,
                questionId: questionData.questionId,
                remainingSeconds: getRemainingSeconds(latestInterview)
            });

            return { waiting: true };
        }

        // Graph finished => interview complete
        await completeInterview(interview.id);

        socket.emit("interview-ended", {
            interviewId: interview.id,
            reason: "COMPLETED"
        });

        return { completed: true };
    });
};

// ============================================================
// SOCKET REGISTRATION
// ============================================================

export const registerInterviewSocket = (io) => {

    io.on("connection", (socket) => {

        console.log("Client connected:", socket.id);

        // ====================================================
        // JOIN / RESTORE INTERVIEW
        // ====================================================

        socket.on("join-interview", async ({ interviewId }) => {

            try {

                const id = Number(interviewId);

                if (!Number.isInteger(id)) {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_NOT_FOUND",
                        message: "Interview not found."
                    });
                    return;
                }

                let interview = await prisma.mockInterview.findUnique({
                    where: { id }
                });

                if (!interview) {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_NOT_FOUND",
                        message: "Interview not found."
                    });
                    return;
                }

                // ----------------------------
                // COMPLETED
                // ----------------------------

                if (interview.status === "COMPLETED") {
                    const questions = await getInterviewQuestions(id);
                    socket.emit("interview-already-completed", {
                        interviewId: id,
                        questions
                    });
                    return;
                }

                // ----------------------------
                // CANCELLED
                // ----------------------------

                if (interview.status === "CANCELLED") {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_UNAVAILABLE",
                        message: "This interview is no longer available."
                    });
                    return;
                }

                // ----------------------------
                // PAUSED -> RESUME
                // ----------------------------

                if (interview.status === "PAUSED") {

                    interview = await resumeInterview(id);

                    if (!interview) {
                        socket.emit("interview-error", {
                            code: "INTERVIEW_NOT_FOUND",
                            message: "Interview not found."
                        });
                        return;
                    }

                    if (interview.status === "COMPLETED") {
                        socket.emit("interview-ended", {
                            interviewId: id,
                            reason: "TIME_EXPIRED"
                        });
                        return;
                    }
                }

                // ----------------------------
                // TIME CHECK
                // ----------------------------

                const remainingSeconds = getRemainingSeconds(interview);

                if (remainingSeconds <= 0) {
                    await completeInterview(id);
                    socket.emit("interview-ended", {
                        interviewId: id,
                        reason: "TIME_EXPIRED"
                    });
                    return;
                }

                // ----------------------------
                // Fetch data
                // ----------------------------

                const questions = await getInterviewQuestions(id);
                const currentQuestion = await getCurrentQuestion(id);

                socket.join(`interview:${id}`);

                socket.emit("interview-restored", {
                    interviewId: id,
                    remainingSeconds,
                    questions,
                    currentQuestion: currentQuestion?.question || null,
                    currentQuestionId: currentQuestion?.id || null
                });

                console.log("Interview restored:", id);

                // ==================================================
                // FIX: If there is no pending question, auto-start
                // the graph so the first question is generated.
                // ==================================================

                if (!currentQuestion) {

                    console.log(
                        `No pending question for interview ${id}. Invoking graph...`
                    );

                    const config = {
                        configurable: { thread_id: `interview:${id}` }
                    };

                    // Ensure startedAt exists
                    if (!interview.startedAt) {
                        interview = await prisma.mockInterview.update({
                            where: { id },
                            data: { startedAt: new Date() }
                        });
                    }

                    // Check if the graph is already interrupted
                    let graphInterrupted = false;

                    try {
                        const snapshot = await interviewGraph.getState(config);
                        graphInterrupted =
                            !!snapshot?.tasks?.some(
                                t => (t.interrupts?.length || 0) > 0
                            );
                    } catch (err) {
                        graphInterrupted = false;
                    }

                    if (graphInterrupted) {
                        console.log(
                            `Graph already interrupted for ${id}. Awaiting user answer.`
                        );
                        return;
                    }

                    // Fresh start
                    const resume = await getCandidateResume(interview.userId);

                    const initialState = {
                        interviewId: id,
                        role: interview.role,
                        round: interview.round,
                        experience: interview.experience,
                        description: interview.description || "",
                        duration: interview.duration,
                        startedAt: interview.startedAt.toISOString(),
                        resume,
                        currentQuestion: null,
                        currentQuestionId: null,
                        currentAnswer: null,
                        evaluation: null,
                        status: "IN_PROGRESS",
                        llmError: null,
                        questionCount: 0,
                        messages: []
                    };

                    try {
                        await runGraphAndEmit(socket, interview, initialState, config);
                    } catch (err) {
                        console.error("Auto-start graph error:", err);
                        socket.emit("interview-error", {
                            code: "GRAPH_START_ERROR",
                            message: "Unable to start interview graph."
                        });
                    }
                }

            } catch (error) {
                console.error("Join interview error:", error);
                socket.emit("interview-error", {
                    code: "RESTORE_ERROR",
                    message: "Unable to restore the interview."
                });
            }
        });

        // ====================================================
        // START BRAND NEW INTERVIEW
        // ====================================================

        socket.on("start-interview", async ({ interviewId }) => {

            try {

                const id = Number(interviewId);

                if (!Number.isInteger(id)) {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_NOT_FOUND",
                        message: "Interview not found."
                    });
                    return;
                }

                let interview = await prisma.mockInterview.findUnique({
                    where: { id }
                });

                if (!interview) {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_NOT_FOUND",
                        message: "Interview not found."
                    });
                    return;
                }

                if (interview.status === "COMPLETED") {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_COMPLETED",
                        message: "This interview has already been completed."
                    });
                    return;
                }

                if (interview.status === "IN_PROGRESS") {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_ALREADY_STARTED",
                        message:
                            "Interview is already in progress. Join the interview instead."
                    });
                    return;
                }

                if (interview.status === "PAUSED") {

                    interview = await resumeInterview(id);
                    const currentQ = await getCurrentQuestion(id);
                    const questions = await getInterviewQuestions(id);

                    socket.emit("interview-restored", {
                        interviewId: id,
                        remainingSeconds: getRemainingSeconds(interview),
                        questions,
                        currentQuestion: currentQ?.question || null,
                        currentQuestionId: currentQ?.id || null
                    });

                    return;
                }

                if (interview.status !== "CREATED") {
                    socket.emit("interview-error", {
                        message: "Interview cannot be started."
                    });
                    return;
                }

                // ----------------------------
                // Start timer
                // ----------------------------

                const startedAt = new Date();

                interview = await prisma.mockInterview.update({
                    where: { id },
                    data: {
                        status: "IN_PROGRESS",
                        startedAt,
                        elapsedSeconds: 0,
                        pausedAt: null,
                        totalPausedSeconds: 0
                    }
                });

                const resume = await getCandidateResume(interview.userId);

                const config = {
                    configurable: { thread_id: `interview:${id}` }
                };

                const initialState = {
                    interviewId: id,
                    role: interview.role,
                    round: interview.round,
                    experience: interview.experience,
                    description: interview.description || "",
                    duration: interview.duration,
                    startedAt: startedAt.toISOString(),
                    resume,
                    currentQuestion: null,
                    currentQuestionId: null,
                    currentAnswer: null,
                    evaluation: null,
                    status: "IN_PROGRESS",
                    llmError: null,
                    questionCount: 0,
                    messages: []
                };

                await runGraphAndEmit(socket, interview, initialState, config);

            } catch (error) {

                console.error("Start interview error:", error);

                const errorText = String(error?.message || error);

                const isRateLimit =
                    errorText.includes("429") ||
                    errorText.toLowerCase().includes("too many requests") ||
                    errorText.toLowerCase().includes("resource exhausted");

                if (isRateLimit) {
                    try {
                        await pauseInterview(Number(interviewId));
                    } catch (pauseError) {
                        console.error("Pause after rate limit failed:", pauseError);
                    }

                    socket.emit("llm-rate-limit", {
                        interviewId: Number(interviewId),
                        message:
                            "The AI interviewer is temporarily unavailable because the AI service has reached its request limit. Your interview has been paused."
                    });

                    return;
                }

                socket.emit("interview-error", {
                    code: "START_ERROR",
                    message: "Unable to start the interview."
                });
            }
        });

        // ====================================================
        // SUBMIT ANSWER
        // ====================================================

        socket.on("submit-answer", async ({ interviewId, answer }) => {

            try {

                const id = Number(interviewId);
                const cleanAnswer = answer?.trim();

                if (!cleanAnswer) {
                    socket.emit("interview-error", {
                        message: "Answer cannot be empty."
                    });
                    return;
                }

                const interview = await prisma.mockInterview.findUnique({
                    where: { id }
                });

                if (!interview) {
                    socket.emit("interview-error", {
                        code: "INTERVIEW_NOT_FOUND",
                        message: "Interview not found."
                    });
                    return;
                }

                if (interview.status !== "IN_PROGRESS") {

                    if (interview.status === "COMPLETED") {
                        socket.emit("interview-ended", {
                            interviewId: id,
                            reason: "COMPLETED"
                        });
                        return;
                    }

                    socket.emit("interview-error", {
                        message: "Interview is not active."
                    });
                    return;
                }

                const remainingSeconds = getRemainingSeconds(interview);

                if (remainingSeconds <= 0) {
                    await completeInterview(id);
                    socket.emit("interview-ended", {
                        interviewId: id,
                        reason: "TIME_EXPIRED"
                    });
                    return;
                }

                const config = {
                    configurable: { thread_id: `interview:${id}` }
                };

                await runGraphAndEmit(
                    socket,
                    interview,
                    new Command({ resume: cleanAnswer }),
                    config
                );

            } catch (error) {
                console.error("Submit answer error:", error);
                socket.emit("interview-error", {
                    code: "ANSWER_ERROR",
                    message: "Unable to process your answer."
                });
            }
        });

        // ====================================================
        // TIME EXPIRED (from client)
        // ====================================================

        socket.on("time-expired", async ({ interviewId }) => {

            try {
                const id = Number(interviewId);
                if (!Number.isInteger(id)) return;

                const interview = await prisma.mockInterview.findUnique({
                    where: { id }
                });

                if (!interview || interview.status === "COMPLETED") return;

                await completeInterview(id);

                io.to(`interview:${id}`).emit("interview-ended", {
                    interviewId: id,
                    reason: "TIME_EXPIRED"
                });

            } catch (error) {
                console.error("Time expired error:", error);
            }
        });

        // ====================================================
        // RETRY INTERVIEW (after LLM error)
        // ====================================================

        socket.on("retry-interview", async ({ interviewId }) => {

            try {

                const id = Number(interviewId);
                if (!Number.isInteger(id)) return;

                let interview = await prisma.mockInterview.findUnique({
                    where: { id }
                });

                if (!interview) return;
                if (interview.status === "COMPLETED") return;

                if (interview.status === "PAUSED") {
                    interview = await resumeInterview(id);
                }

                const currentQuestion = await getCurrentQuestion(id);

                if (currentQuestion) {
                    socket.emit("interview-question", {
                        interviewId: id,
                        question: currentQuestion.question,
                        questionId: currentQuestion.id,
                        remainingSeconds: getRemainingSeconds(interview)
                    });
                    return;
                }

                const resume = await getCandidateResume(interview.userId);

                const config = {
                    configurable: { thread_id: `interview:${id}` }
                };

                const initialState = {
                    interviewId: id,
                    role: interview.role,
                    round: interview.round,
                    experience: interview.experience,
                    description: interview.description || "",
                    duration: interview.duration,
                    startedAt: interview.startedAt?.toISOString() ||
                        new Date().toISOString(),
                    resume,
                    currentQuestion: null,
                    currentQuestionId: null,
                    currentAnswer: null,
                    evaluation: null,
                    status: "IN_PROGRESS",
                    llmError: null,
                    questionCount: 0,
                    messages: []
                };

                await runGraphAndEmit(socket, interview, initialState, config);

            } catch (error) {
                console.error("Retry interview error:", error);
                socket.emit("interview-error", {
                    code: "RETRY_ERROR",
                    message: "Unable to retry the interview."
                });
            }
        });

        // ====================================================
        // EXIT / PAUSE INTERVIEW
        // ====================================================

        socket.on("exit-interview", async ({ interviewId }) => {

            try {

                const id = Number(interviewId);

                const interview = await prisma.mockInterview.findUnique({
                    where: { id }
                });

                if (!interview) return;
                if (interview.status !== "IN_PROGRESS") return;

                const pausedInterview = await pauseInterview(id);

                socket.emit("interview-paused", {
                    interviewId: id,
                    remainingSeconds: pausedInterview
                        ? Math.max(
                            0,
                            pausedInterview.duration * 60 -
                                pausedInterview.elapsedSeconds
                        )
                        : 0
                });

            } catch (error) {
                console.error("Exit interview error:", error);
            }
        });

        // ====================================================
        // DISCONNECT
        // ====================================================

        socket.on("disconnect", async (reason) => {

            console.log("Client disconnected:", socket.id, "| Reason:", reason);

            try {

                const rooms = [...socket.rooms];

                for (const room of rooms) {

                    if (!room.startsWith("interview:")) continue;

                    const interviewId = Number(
                        room.replace("interview:", "")
                    );

                    if (!Number.isInteger(interviewId)) continue;

                    await pauseInterview(interviewId);

                    console.log(
                        `Interview ${interviewId} paused (socket disconnect).`
                    );
                }

            } catch (error) {
                console.error("Disconnect pause error:", error);
            }
        });
    });
};