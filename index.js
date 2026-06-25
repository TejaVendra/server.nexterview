import express, { json } from 'express'
import {Client} from 'pg'
const app = express();

const client = new Client({
    connectionString:"postgresql://neondb_owner:npg_koZhx0Ucfi9K@ep-odd-lab-aqczy8q6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
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