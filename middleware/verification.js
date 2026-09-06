export const verification = (req,res,next) =>{

    if(!req.user.isVerified){
        return res.status(403).json({
            success:false,
            message:"Please verify your email first."
        });

    }
    next();
}