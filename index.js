import express, { json } from 'express'
import dotenv from 'dotenv'
import { Client } from 'pg'
const app = express();
dotenv.config()
const client = new Client({
    connectionString: process.env.CONNECTION_STRING,
    ssl:{
        rejectUnauthorized:false
    }
})

app.get('/',(req,res)=>{
    return res.json({"message" :"home is getting called ...."})
})
async function main() {
  try {
    await client.connect();
    console.log("✅ Connected to Neon!");

    const result = await client.query("SELECT NOW()");
    console.log(result.rows);

    await client.end();
  } catch (err) {
    console.error("❌ Connection error:", err);
  }
}

main();
app.listen(3000,() =>{
    try {
        console.log('server is start')

    } catch (error) {
        console.error("Error to start thr server")
    }
})