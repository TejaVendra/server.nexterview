import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId) =>{
    
    return jwt.sign({
        userId
    },process.env.JWT_SECRET_ACCESS,
    {
     expiresIn: "15m"
    })
}



export const generateRefreshToken = (userId) =>{
    
    return jwt.sign({
        userId  
    },
    process.env.JWT_SECRET_REFRESH,
    {
        expiresIn:"7d"
    })
}