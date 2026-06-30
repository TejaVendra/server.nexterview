import express, { json } from 'express'
import dotenv from 'dotenv'
import helmet from 'helmet'
import connectDB from './database/server.js';
import {prisma} from "./database/db.js";
const app = express();
app.use(helmet());

connectDB();


app.get('/', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
const PORT = process.env.PORT || 3000

app.listen(PORT,() =>{
    try {
        console.log(`Server is running on --> http://localhost:${PORT}`);

    } catch (error) {
        console.error("Error is occurred when try to start thr server")
    }
})