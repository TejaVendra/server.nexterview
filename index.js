import express, { json } from 'express'
import dotenv from 'dotenv'
import helmet from 'helmet'
import connectDB from './database/server.js';
import {prisma} from "./database/db.js";
import userRouter from './routes/UserRouter.js'
import cookieParser  from 'cookie-parser'
import cors from 'cors'
import http from 'http'
import { Server } from "socket.io";


const app = express();

export const server = http.createServer(app);


app.use(helmet());
app.use(express.json());
app.use(cookieParser());
connectDB();
app.use(cors({
    origin: "http://localhost:5173",
    credentials:true,
}));

app.get('/', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.use('/auth',userRouter);

const PORT = process.env.PORT || 3000;

export const io = new Server(server,{
    cors:{
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
})

io.on("connection",(socket) => {
    console.log("Connected : ",socket.id);

    socket.on("disconnect",() => {
        console.log("Disconnted:",socket.id);
    });
})



server.listen(PORT,() =>{
    try {
        console.log(`Server is running on --> http://localhost:${PORT}`);

    } catch (error) {
        console.error("Error is occurred when try to start thr server")
    }
})