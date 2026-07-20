import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId,res) =>{
    
    return jwt.sign({
        userId
    },process.env.JWT_SECRET,
{
            expiresIn: "15m"
        })
}