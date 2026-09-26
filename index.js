import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import connectDB from "./database/server.js";
import userRouter from "./routes/UserRouter.js";
import interviewRouter from "./routes/interviewRouter.js";
import resumeAnalysisRouter from "./routes/resumeAnalsisRouter.js";

// ⬇️ Note: io is created AND interview sockets are
//    registered inside libs/server.js, so we just import.
import { app, server } from "./libs/server.js";

import { initCheckpointer } from "./ai/interviewGraph.js";


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());


// ============================================================
// ROUTES
// ============================================================

app.get("/health", (req, res) => {
    return res.status(200).json({
        status: "ok",
        timestamp: Date.now(),
    });
});

app.use("/auth", userRouter);
app.use("/interview", interviewRouter);
app.use("/resume",resumeAnalysisRouter);


// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // 1. MongoDB
        await connectDB();

        // 2. PostgresSaver tables
        await initCheckpointer();

        // 3. Start listening
        //    (Socket.IO is already wired inside libs/server.js)
        server.listen(PORT, () => {
            console.log(
                `Server is running on --> http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();