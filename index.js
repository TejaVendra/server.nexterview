import express from 'express'
import helmet from 'helmet'
import connectDB from './database/server.js';
import userRouter from './routes/UserRouter.js'
import interviewRouter from './routes/interviewRouter.js'
import cookieParser  from 'cookie-parser'
import cors from 'cors'
import { app } from './libs/server.js';
import { server } from './libs/server.js';
import 'dotenv/config'



app.use(cors({
    origin: "http://localhost:5173",
    credentials:true,
}));

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
connectDB();





app.get('/health',(req,res) => {
    return res.status(200).json({
         status:"ok",
         timestamp: Date.now(),
    })
})


app.use('/auth',userRouter);
app.use('/interview',interviewRouter)

const PORT = process.env.PORT || 3000;



server.listen(PORT,() =>{
    try {
        console.log(`Server is running on --> http://localhost:${PORT}`);

    } catch (error) {
        console.error("Error is occurred when try to start thr server")
    }
})