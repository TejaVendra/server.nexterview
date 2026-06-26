import { Client } from 'pg'
import { config } from 'dotenv';
config()

const client = new Client({
    connectionString: process.env.CONNECTION_STRING,
        ssl:{
            rejectUnauthorized:false
        }
})
 

async function connectDB(){
    try {

        await client.connect();
        console.log("Database server connected successfully...")

        const result = await client.query("SELECT NOW()");
        console.log(result.rows);

        await client.end()
        
    } catch (error) {
        console.error("Error is occurred when try to connect to database server : ",error)
    }
}

export default connectDB;