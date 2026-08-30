import { prisma } from "../database/db.js";
import client from "../redis/redisServer.js";


export const userProfile = async ( req,res) =>{
    try {

      const { email } = req.params;

      if(!email){
          return res.status(400).json({
            sucess:false,
            message:"Email is required."
          })
      }

      const cacheKey = `user:${email}`;

      //check the redis wheather the user is present to not --> HIT

      const cachedUser = await client.get(cacheKey);

      if(cachedUser){
         return res.status(200).json({
            success : true,
            user : JSON.parse(cachedUser)
         });
      }


      // if user not found in redis we have fetch the user and store it in redis ans return --> MISS

       const user = await prisma.user.findUnique({
        where:{
            email,
        },
      });

      
      if(!user){
        return res.status(404).json({
          sucess:false,
          message:"Account not found",
        });
      }
      // store in redis 
      await client.set(cacheKey,JSON.stringify(user),"EX",60*60);
       // 1 hour expire time to auto delete

      return res.status(200).json({
        success:true,
         user
      }) 
    } catch (error) {
         console.error("User profile error:", error);

          return res.status(500).json({
          success:false,
          message:"Interval server issuse"
          })
        
    }
}

