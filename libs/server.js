import express from "express";
import { Server } from "socket.io";
import http from "http";
import { registerInterviewSocket } from "../sockets/interviewSocket.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    },
    maxHttpBufferSize: 1e7,
});

registerInterviewSocket(io);

// Optional user map for other features
const userSocketMap = {};

export { io, server, app, userSocketMap };