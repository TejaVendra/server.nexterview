import {prisma} from "./db.js";

async function connectDB(){
    try {
         await prisma.$connect();
         console.log("Database is connected succesfully...!");
    } catch (error) {
        console.error("Error while connecting to the database",error);
    
    }
}

export default connectDB;