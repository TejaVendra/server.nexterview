import jwt from 'jsonwebtoken'
import { Prisma } from '../database/db.js'


export const protectedRoute = async(req,res,next) =>{

    try {

        const token = req.headers.authorization?.split(" ")[1];

        if(!token){
            return res.status(401).json({
                success : false,
                message : "No token provided",
            })
        }



        const decoded = await jwt.verify(token,process.env.JWT_SECRET);

        const user  = await Prisma.user.findUnique({
            where:{
                id : decoded.userId,
            }
        });

        if(!user){return res.status(403).json({
            success : false,
            message : "Unauthorized access"
        });
    }

        res.user = user;

        next();

        
    } catch (error) {
        console.error("Error in middleware file : ",error);
        return res.status(401).json({
            success : false,
            message : "Invalid or expired token",
        })
    }
} 

