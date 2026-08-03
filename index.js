import express, { json } from 'express'
import dotenv from 'dotenv'
import helmet from 'helmet'
import connectDB from './database/server.js';
import {prisma} from "./database/db.js";
import userRouter from './routes/UserRouter.js'
import cors from 'cors'


const app = express();
app.use(helmet());
app.use(express.json())
connectDB();
app.use(cors({
    origin: "http://localhost:5173"
}));

app.get('/', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.use('/auth',userRouter);
const PORT = process.env.PORT || 3000

app.listen(PORT,() =>{
    try {
        console.log(`Server is running on --> http://localhost:${PORT}`);

    } catch (error) {
        console.error("Error is occurred when try to start thr server")
    }
})