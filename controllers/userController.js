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

export const updateName = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

 
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

   
    const user = await prisma.user.update({
      where: {
        id:userId,
      },
      data: {
        name: name.trim(),
      },
    });

   
    await client.del(`user:${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Name updated successfully.",
      user,
    });

  } catch (error) {
    console.error("Error in the user controller:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server issue.",
    });
  }
};

export const updateProfilePic = async (req,res) => {
  try {

    const { profilePic } = req.body;
    const userId = req.user.id;

    if(!profilePic || !profilePic.trim()){
      return res.status(400).json({
        success:false,
        message:"Profile pic is required."
      });
    }

    // handle image upload to the server

    const user = await prisma.user.update({
      where:{
        id:userId,
      },
      data:{
        
      },
    })
    
  } catch (error) {
    
  }
}

export const deleteUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const firebaseId = req.user.firebaseId;

   
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    
    await admin.auth().deleteUser(firebaseId);

   
    await client.del(`user:${email}`);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });

  } catch (error) {
    console.error("Error deleting user:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server issue.",
    });
  }
};