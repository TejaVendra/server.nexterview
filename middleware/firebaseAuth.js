import admin from '../authentication/firebaseAdmin.js'
import { prisma } from '../database/db.js';

const firebaseAuth = async(req,res) =>{
    const { idToken } = req.body;

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
        }




        
        
    } catch (error) {
        
    }
}

