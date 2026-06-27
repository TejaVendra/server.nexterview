import express, { json } from 'express'
import dotenv from 'dotenv'
import connectDB from './database/server.js';
import helmet from 'helmet'

const app = express();
app.use(helmet());

connectDB();

app.get('/',(req,res)=>{
    return res.json({"message" :"start..."})
})

const PORT = process.env.PORT || 3000

app.listen(PORT,() =>{
    try {
        console.log(`Server is running on --> http://localhost:${PORT}`);

    } catch (error) {
        console.error("Error is occurred when try to start thr server")
    }
})