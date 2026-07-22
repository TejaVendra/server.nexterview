import admin from '../authentication/firebaseAdmin.js';
import { prisma } from '../database/db.js';
import { generateAccessToken, generateRefreshToken } from '../libs/genToken.js';

export const firebaseAuth = async (req, res) => {
  const { idToken } = req.body; // get the data from client where client sends the data in the body


  // if the token is not receieved , here 400 means bad request --> bad request from client side >>>>
  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "ID token is required",
    });
  }

  try {
    //  Verify token (Decoded payload , that has email, picture, name, etc.)
    const decoded = await admin.auth().verifyIdToken(idToken);  // tc : o(1)

    // Use Prisma `upsert` (1 DB call instead of 2) , or we can we use both create if not exist else update the user but it takes the 2 calls , thats why  we use the upsert 
    const user = await prisma.user.upsert({
      where: { firebaseId: decoded.uid },
      update: {
        name: decoded.name || null,
        photoURL: decoded.picture || null,
        isVerified: decoded.email_verified || false,
      },
      create: {
        firebaseId: decoded.uid,
        email: decoded.email,
        name: decoded.name || null,
        isVerified: decoded.email_verified || false,
        provider: decoded.firebase?.sign_in_provider || 'firebase',
        photoURL: decoded.picture || null,
      },
    }); // tc :- with index --> o(log(n)) , but consider 0(1) in pratical for read operation . and 0(1) for write operation

    // issusing the new access and refresh tokens when user logins . here we use the database id not firebase uid , we can also use the firebase uid or we can we both
    // i just dont want to put the firebase uid in tokens 
    const accessToken = generateAccessToken(user.id); //o(1)
    const refreshToken = generateRefreshToken(user.id); //0(1)

    // return the success response to client by 200(ok standard success response) . here we can also use 201 status code but we doing two methods either create or update so we just use 200

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      accessToken,
      refreshToken,
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


// total time complexity for this code is --> appro. o(n);
// total space complexity :- o(1)

// so performance depends on here is : network latency , database operations time , 