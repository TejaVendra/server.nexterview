import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId,res) =>{
    
    return jwt.sign({
        userId
    },process.env.JWT_SECRET,
{
            expiresIn: "15m"
        })
}



export const generateRefreshToken = (userId,res) =>{
    return jwt.sign({
        userId  
    },
process.env.JWT_SECRET,
{
    expiresIn:"7d"
})
}