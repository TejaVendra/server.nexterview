import { adminAuth } from '../authentication/firebaseAdmin.js';
import { prisma } from '../database/db.js';
import { generateAccessToken, generateRefreshToken } from '../libs/genToken.js';
import client from '../redis/redisServer.js';

export const firebaseAuth = async (req, res) => {
  try {

      const { idToken } = req.body; // get the data from client where client sends the data in the body

      // if the token is not receieved , here 400 means bad request --> bad request from client side >>>>
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "ID token is required",
        });
      }

    // Verify token (Decoded payload , that has email, picture, name, etc.)
    const decoded = await adminAuth.verifyIdToken(idToken); 

    // Use Prisma `upsert` (1 DB call instead of 2) , or we can we use both create if not exist else update the user but it takes the 2 calls , thats why we use the upsert
    const user = await prisma.user.upsert({
      where: { 
        firebaseId: decoded.uid,
       },
      update: {
         isVerified: decoded.email_verified || false,
      },
      create: {
        firebaseId: decoded.uid,
        email: decoded.email,
        name: decoded.name || null,
        isVerified: decoded.email_verified || false,
        provider: decoded.firebase?.sign_in_provider || "firebase",
        photoURL: decoded.picture || null,
      },
        select: {
        id: true,
        firebaseId: true,
        email: true,
        name: true,
        photoURL: true,
        isVerified: true,
        provider: true,
    },
    
    }); 

    // Store the user in Redis cache for faster future access
    // Key  : user:<database_user_id>
    // TTL  : 1 hour
    await client.set(
      `user:${user.id}`,
      JSON.stringify(user),
       "EX",
       3600
    );

    // issuing the new access and refresh tokens when user logins.
    // here we use the database id not firebase uid,
    // we can also use the firebase uid or we can use both
    // i just dont want to put the firebase uid in tokens
    const accessToken = generateAccessToken(user.id); 
    const refreshToken = generateRefreshToken(user.id); 

    // Store refresh token in Redis
    // Key : refresh:<database_user_id>
    // TTL : 7 days (should match your JWT refresh token expiry)
    await client.set(
      `refresh:${user.id}`,
      refreshToken,
      "EX",
        60 * 60 * 24 * 7
    );

    // return the success response to client by 200(ok is standard success response).
    // here we can also use 201 status code but we doing two methods either
    // create or update so we just use 200

    res.cookie("refreshToken",refreshToken,{
      httpOnly:true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      accessToken,
    });

  } catch (error) {
    console.error("Error in Firebase Auth file :", error);

    // Sanitized error message for client security
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};


