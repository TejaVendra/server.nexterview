import { prisma } from "../database/db.js";



export const getAnalysisScores = async(req,res) =>{
    try {

        let resumeAnalysisScore = await prisma.resumeAnalysis.findUnique({
            where:{
                userId:req.user.id,
            }
            ,
            select:{
                atsScore:true,
            }
        });

        if(!resumeAnalysisScore){
            resumeAnalysisScore = 0;
        }
        let jobMatchScore = await prisma.resumeMatchAnalysis.findUnique({
            where:{
                userId:req.user.id,
            },
            select:{
                atsScore:true,
            }
        });

        if(!jobMatchScore){
            jobMatchScore = 0;
        }

        let portfolioAnalysisScore = await prisma.portfolioAnalysis.findUnique({
            where:{
                userId:req.user.id,
            },
            select:{
                 overallScore:true,
            }
        })
        if(!portfolioAnalysisScore){
            portfolioAnalysisScore = 0;
        }

        return res.status(200).json({
            success:true,
            scores:{
                portfolioAnalysisScore,
                resumeAnalysisScore,
                jobMatchScore,
            }
        })

        
    } catch (error) {

        console.error("Error in the dashboard controller -> get scores : ",error);
        return res.status(500).json({
            success:false,
            message:"Failed to get the analysis scores"
        })
        
    }
}