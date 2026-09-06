import { prisma } from "../database/db.js";
import client from "../redis/redisServer.js";
import cloudinary from "../cloudinary/cloudinaryServer.js";
import jwt from 'jsonwebtoken'
import { generateAccessToken } from "../libs/genToken.js";
import { adminAuth } from "../authentication/firebaseAdmin.js";

//  API end points for user authentication

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
      select:{
          id: true,
          firebaseId: true,
          email: true,
          name: true,
          photoURL: true,
          isVerified: true,
          provider: true,
      }
    });

   //update the cache user 
    await client.set(`user:${userId}`,JSON.stringify(user),"EX",3600);

    return res.status(200).json({
      success: true,
      message: "Name updated successfully.",
      user,
    });

  } catch (error) {
    console.error("Error in the user controller:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server issue.",
    });
  }
};

export const getSignature = async(req,res) =>{
  try {

    const timestamp = Math.round(new Date() / 1000);

    const signature = cloudinary.utils.api_sign_request(
          {
            timestamp,
            folder:"profile-pictures"
          },
          process.env.CLOUDINARY_API_SECRET
      );

    return res.status(200).json({
      success:true,
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });
    
  } catch (error) {

    console.error("Error in get signature file :",error.message);

    return res.status(500).json({
      success:false,
      message:"Internal server issuse."
    });
    
  }
}

export const updateProfilePic = async (req,res) => {
  try {

    const { photoURL , public_id } = req.body;
    const userId = req.user.id;

    if(!photoURL || !photoURL.trim() || !public_id || !public_id.trim()){
      return res.status(400).json({
        success:false,
        message:"Profile pic is required."
      });
    }

    const user = await prisma.user.update({
      where:{
        id:userId,
      },
      data:{
        photoURL,
        public_id
      },
      select:{
          id: true,
          firebaseId: true,
          email: true,
          name: true,
          photoURL: true,
          isVerified: true,
          provider: true,
      }
    });

    await client.set(`user:${userId}`,
      JSON.stringify(user),
      "EX",
      3600
     );

    return res.status(200).json({
      success:true,
       message:"Profile pic updated successfully."
    });

    
  } catch (error) {

    console.error("Error in update profile pic : ",error.message);
    return res.status(500).json({
      success:false,
      message:"Internal Server Issue."
    });
    
  }
}

export const deleteUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const firebaseId = req.user.firebaseId;

    //delete the firebase user
    await adminAuth.auth().deleteUser(firebaseId);
   
    //delete the database
    await prisma.user.delete({
      where: {
        id: userId,
      },
    });
 
    // delete the cached user
    await client.del(`user:${userId}`);

    // delete the cached refreh token
    await client.del(`refresh:${userId}`);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
    });

  } catch (error) {
    console.error("Error deleting user:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server issue.",
    });
  }
};


export const checkAuth = async(req,res) =>{

    return res.status(200).json({
      success:true,
      user:req.user,
    });  
 
}


export const getRefreshToken = async(req,res) =>{
        try {

          const refreshToken = req.cookies.refreshToken;

          if(!refreshToken){
            return res.status(401).json({
              success:false,
              message:"Refresh token required."
            })
          }

          const decoded =  jwt.verify(refreshToken,process.env.JWT_SECRET_REFRESH);

          const storedRefreshToken = await client.get(
              `refresh:${decoded.userId}`
          );

          if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
              return res.status(401).json({
                  success: false,
                  message: "Invalid refresh token"
              });
          }

          const user = await prisma.user.findUnique({
            where:{
              id:decoded.userId
            },
            select: {
              id: true
            }
          });

          if(!user){
            return res.status(401).json({
              success:false,
              message:"User not found."
            })
          }

          const accessToken = generateAccessToken(user.id);
          

          return res.status(200).json({
            success:true,
            accessToken,
          });
          
        } catch (error) {

          console.error("Error in get refresh token: ",error.message);

          return res.status(401).json({
              success: false,
              message: "Invalid or expired refresh token."
          });
          
        }
}


