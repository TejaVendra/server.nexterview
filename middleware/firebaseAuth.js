import admin from '../authentication/firebaseAdmin.js'
import { prisma } from '../database/db.js';
import { generateAccessToken, generateRefreshToken } from '../libs/genToken.js';

const firebaseAuth = async(req,res) =>{
    const { idToken } = req.body;

    if(!idToken){
        return res.status(400).json({
            success:false,
            message : "Id token is required",
        })
    } 

    try {

        const decoded = await admin.auth().verifyIdToken(idToken);

        const firebaseUser = await admin.auth().getUser(decoded.uid);

        let user = await prisma.user.findUnique({
            where:{
                firebaseId : decoded.uid
            }
        });

        if(!user){
            user = await prisma.user.create({
                data:{
                    firebaseId: decoded.uid,
                    email : firebaseUser.email,
                    name : firebaseUser.displayName,
                    isVerified : firebaseUser.emailVerified,
                    provider : firebaseUser.providerData[0]?.providerId,
                    photoURL : firebaseUser.photoURL,
                }
            })
        }else{
            user  = await prisma.user.update({
                where:{
                    firebaseId : decoded.uid,
                },
                data:{
                    name : firebaseUser.displayName,
                    photoURL:firebaseUser.photoURL,
                    isVerified : firebaseUser.emailVerified,
                }
            })
        }


        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.uid);

        return res.status(200).json({
            success:true,
            message:"Login Successful",
            user,
            accessToken,
            refreshToken,
        })
        
    } catch (error) {

        console.error(error);

        return res.status(401).json({
            success:false,
            message : error.message,
        })
        
    }
}

