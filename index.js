import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import connectDB from "./database/server.js";
import userRouter from "./routes/UserRouter.js";
import interviewRouter from "./routes/interviewRouter.js";
import resumeAnalysisRouter from "./routes/resumeAnalsisRouter.js";
import portfolioAnalyzerRouter from './routes/portfolioAnalyzerRouter.js'

import {initBrowser} from './services/scraper.js'

import { app, server } from "./libs/server.js";

import { initCheckpointer } from "./ai/interviewGraph.js";




app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());




app.get("/health", (req, res) => {
    return res.status(200).json({
        status: "ok",
        timestamp: Date.now(),
    });
});

app.use("/auth", userRouter);
app.use("/interview", interviewRouter);
app.use("/resume",resumeAnalysisRouter);
app.use("/portfolio",portfolioAnalyzerRouter);




const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // 1. MongoDB
        await connectDB();

        // 2. PostgresSaver tables
        await initCheckpointer();

        // cromium broswe for scaping
        await initBrowser();


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