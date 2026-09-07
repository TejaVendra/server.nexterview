import jwt from 'jsonwebtoken'
import { prisma } from '../database/db.js'
import client from '../redis/redisServer.js';


export const protectedRoute = async(req,res,next) =>{

    try {

        const token = req.headers.authorization?.split(" ")[1];

        if(!token){
            return res.status(401).json({
                success : false,
                message : "No token provided",
            })
        }

        //verify the token is wheather it is valid or not
        const decoded = jwt.verify(token,process.env.JWT_SECRET_ACCESS); 

        const cachedUser = await client.get(`user:${decoded.userId}`);

        if(cachedUser){
            req.user = JSON.parse(cachedUser);
            return next();
        }

        const user  = await prisma.user.findUnique({
            where:{
                id : decoded.userId,
            },
            select:{
                id:true,
                email:true,
                name:true,
                photoURL:true,
            }
        }); // gets the data from database by 

        if(!user){
            return res.status(403).json({
           success : false,
            message : "Unauthorized access"
        });
       }

        await client.set(
            `user:${user.id}`,
            JSON.stringify(user),
            "EX",
            3600
        );

        req.user = user;

        return next();

        
    } catch (error) {
        console.error("Error in middleware file : ",error.message);
        return res.status(401).json({
            success : false,
            message : "Invalid or expired token",
        })
    }
} 

