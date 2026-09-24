import { prisma } from "../database/db.js"
import client from "../redis/redisServer.js";

export const createMockInterview = async(req,res) =>{
    try {

        const { role , round , experience , duration } = req.body;

        if (!role || !round || !experience || !duration) {
            return res.status(400).json({
                success: false,
                message: "Required interview fields are missing."
            });
        }

        const interviewDuration = Number(duration);

        if (!Number.isInteger(interviewDuration) || interviewDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Duration must be a valid positive number."
            });
        }

        const userId = req.user.id;


        // lets checks the user has areadly uses the daily free trails or not (24 ~ hours has 3 tries) ansd incr is also handles the race condition since its a atomic

        const key = `interview:${userId}:count`;

        const currentCount = await client.get(key);

        if (currentCount && Number(currentCount) >= 3) {
            return res.status(429).json({
                success: false,
                message: "Your daily limit has been reached. Please try again later."
            });
        }

        const count = await client.incr(key);

        if (count === 1) {
            await client.expire(key, 60 * 60 * 24);
        }

       

     

        const interview = await prisma.mockInterview.create({

            data:{
                userId,
                role,
                round,
                experience,
                duration : Number(duration),
            
            }
          
        });

    


        return res.status(201).json({
            success:true,
            message:"Mock interview created sucessfully.",
            data: {
                interviewId: interview.id,
                status: interview.status
            }
        })

        
    } catch (error) {

        console.error("Create mock interview error :",error);

        return res.status(500).json({
            success:false,
            message:"Failed to create mock interview."
        })
        
    }

}


