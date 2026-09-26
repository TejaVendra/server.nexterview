import { prisma } from "../database/db.js";
import client from "../redis/redisServer.js";

// ======================================================
// CREATE INTERVIEW
// ======================================================

export const createMockInterview = async (req, res) => {
    try {

        const {
            role,
            round,
            experience,
            duration,
            description
        } = req.body;

        // ------------------------------------------
        // Validate input
        // ------------------------------------------

        if (!role || !round || !experience || !duration) {
            return res.status(400).json({
                success: false,
                message: "Required interview fields are missing."
            });
        }

        const interviewDuration = Number(duration);

        if (
            !Number.isInteger(interviewDuration) ||
            interviewDuration <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Duration must be a valid positive number."
            });
        }

        // ------------------------------------------
        // User
        // ------------------------------------------

        const userId = req.user.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        // ------------------------------------------
        // Daily limit
        // ------------------------------------------

        const key = `interview:${userId}:count`;

        const currentCount = await client.get(key);

        if (
            currentCount &&
            Number(currentCount) >= 3
        ) {
            return res.status(429).json({
                success: false,
                message:
                    "Your daily limit has been reached. Please try again later."
            });
        }

        const count = await client.incr(key);

        if (count === 1) {
            await client.expire(
                key,
                60 * 60 * 24
            );
        }

        // ------------------------------------------
        // Create interview
        // ------------------------------------------

        const interview =
            await prisma.mockInterview.create({
                data: {
                    userId,

                    role,

                    round,

                    experience,

                    duration: interviewDuration,

                    description:
                        description || null
                }
            });

        console.log(
            "Created interview:",
            interview.id
        );

        // ------------------------------------------
        // Response
        // ------------------------------------------

        return res.status(201).json({
            success: true,

            message:
                "Mock interview created successfully.",

            data: {
                interviewId: interview.id,

                status: interview.status,

                role: interview.role,

                round: interview.round,

                experience: interview.experience,

                duration: interview.duration
            }
        });

    } catch (error) {

        console.error(
            "Create mock interview error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to create mock interview."
        });
    }
};


// ======================================================
// GET INTERVIEW
// ======================================================

export const getMockInterview = async (req, res) => {

    try {

        const interviewId =
            Number(req.params.id);

        console.log(
            "GET INTERVIEW ID:",
            interviewId
        );

        console.log(
            "CURRENT USER:",
            req.user?.id
        );

        // ------------------------------------------
        // Validate ID
        // ------------------------------------------

        if (
            !Number.isInteger(interviewId) ||
            interviewId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid interview ID."
            });
        }

        // ------------------------------------------
        // Find interview
        // ------------------------------------------

        const interview =
            await prisma.mockInterview.findUnique({
                where: {
                    id: interviewId
                },

                select: {

                    id: true,

                    userId: true,

                    role: true,

                    round: true,

                    experience: true,

                    duration: true,

                    description: true,

                    status: true,

                    startedAt: true,

                    elapsedSeconds: true,

                    pausedAt: true,

                    totalPausedSeconds: true,

                    completedAt: true,

                    score: true,

                    feedback: true,

                    createdAt: true,

                    updatedAt: true,

                    questions: {
                        orderBy: {
                            order: "asc"
                        },

                        select: {
                            id: true,
                            question: true,
                            answer: true,
                            feedback: true,
                            score: true,
                            order: true,
                            createdAt: true
                        }
                    }
                }
            });

        // ------------------------------------------
        // Not found
        // ------------------------------------------

        if (!interview) {

            console.log(
                "Interview does not exist:",
                interviewId
            );

            return res.status(404).json({
                success: false,
                message:
                    "Interview not found."
            });
        }

        // ------------------------------------------
        // Ownership
        // ------------------------------------------

        if (
            Number(interview.userId) !==
            Number(req.user.id)
        ) {

            console.log(
                "Interview ownership mismatch"
            );

            console.log(
                "Interview user:",
                interview.userId
            );

            console.log(
                "Request user:",
                req.user.id
            );

            return res.status(404).json({
                success: false,
                message:
                    "Interview not found."
            });
        }

        // ------------------------------------------
        // Completed
        // ------------------------------------------

        if (
            interview.status === "COMPLETED"
        ) {

            return res.status(200).json({
                success: true,

                data: {
                    interview,

                    canJoin: false,

                    alreadyCompleted: true
                }
            });
        }

        // ------------------------------------------
        // Cancelled
        // ------------------------------------------

        if (
            interview.status === "CANCELLED"
        ) {

            return res.status(200).json({
                success: true,

                data: {
                    interview,

                    canJoin: false,

                    cancelled: true
                }
            });
        }

        // ------------------------------------------
        // CREATED / IN_PROGRESS / PAUSED
        // ------------------------------------------

        return res.status(200).json({

            success: true,

            data: {

                interview,

                canJoin: true,

                alreadyCompleted: false
            }
        });

    } catch (error) {

        console.error(
            "Get mock interview error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch interview."
        });
    }
};


// ======================================================
// START INTERVIEW
// ======================================================

export const startMockInterview = async (req, res) => {

    try {

        const interviewId =
            Number(req.params.id);

        if (
            !Number.isInteger(interviewId) ||
            interviewId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid interview ID."
            });
        }

        const interview =
            await prisma.mockInterview.findUnique({
                where: {
                    id: interviewId
                }
            });

        // ------------------------------------------
        // Not found
        // ------------------------------------------

        if (!interview) {

            return res.status(404).json({
                success: false,
                message:
                    "Interview not found."
            });
        }

        // ------------------------------------------
        // Ownership
        // ------------------------------------------

        if (
            Number(interview.userId) !==
            Number(req.user.id)
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Interview not found."
            });
        }

        // ------------------------------------------
        // Already completed
        // ------------------------------------------

        if (
            interview.status === "COMPLETED"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Interview has already been completed."
            });
        }

        // ------------------------------------------
        // Already in progress
        //
        // IMPORTANT:
        // Refresh should NOT create another start time.
        // ------------------------------------------

        if (
            interview.status === "IN_PROGRESS"
        ) {

            return res.status(200).json({

                success: true,

                message:
                    "Interview is already in progress.",

                data: {
                    interview,
                    resumed: true
                }
            });
        }

        // ------------------------------------------
        // Paused
        // ------------------------------------------

        // ------------------------------------------
        // Paused
        // ------------------------------------------

        if (interview.status === "PAUSED") {

            const resumedInterview =
                await prisma.mockInterview.update({

                    where: { id: interviewId },

                    data: {
                        status: "IN_PROGRESS",
                        startedAt: new Date(),
                        pausedAt: null
                        // DO NOT reset elapsedSeconds
                    }
                });

            return res.status(200).json({
                success: true,
                message: "Interview resumed successfully.",
                data: {
                    interview: resumedInterview,
                    resumed: true
                }
            });
        }

        // ------------------------------------------
        // Only CREATED reaches here
        // ------------------------------------------

        if (
            interview.status !== "CREATED"
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Interview cannot be started."
            });
        }

        // ------------------------------------------
        // Start new interview
        // ------------------------------------------

        const startedAt = new Date();

        const updatedInterview =
            await prisma.mockInterview.update({

                where: {
                    id: interviewId
                },

                data: {

                    status: "IN_PROGRESS",

                    startedAt,

                    elapsedSeconds: 0,

                    pausedAt: null,

                    totalPausedSeconds: 0
                }
            });

        console.log(
            `Interview ${interviewId} started`
        );

        return res.status(200).json({

            success: true,

            message:
                "Interview started successfully.",

            data: {

                interview:
                    updatedInterview,

                resumed: false
            }
        });

    } catch (error) {

        console.error(
            "Start interview error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to start interview."
        });
    }
};