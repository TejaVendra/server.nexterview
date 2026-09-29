import { prisma } from "../database/db.js";
import { analyzePortfolioWithLLM } from "../llm/service.js";
import { scrapePorfolio } from "../services/scraper.js";




export const analyzePortfolio = async (req, res) => {
    try {

        let { url } = req.body;

        if (!url || url.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "URL is required."
            });
        }

        url = url.trim();

        console.log('====================================');
        console.log("analzye hits...");
        console.log('====================================');

     
        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
        }

      

        const text = await scrapePorfolio(url);

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Could not extract content from the portfolio."
            });
        }

   

        const analysis = await analyzePortfolioWithLLM(text);

        if (!analysis) {
            return res.status(500).json({
                success: false,
                message: "Portfolio analysis failed."
            });
        }



        const savedAnalysis =
            await prisma.portfolioAnalysis.upsert({

                where: {
                    userId: req.user.id,
                },

                update: {

                    overallScore: analysis.overallScore,

                    projectScore: analysis.projectScore,
                    technicalScore: analysis.technicalScore,
                    impactScore: analysis.impactScore,
                    experienceScore: analysis.experienceScore,
                    presentationScore: analysis.presentationScore,
                    documentationScore: analysis.documentationScore,
                    careerRelevanceScore:
                        analysis.careerRelevanceScore,

                    summary: analysis.summary,

                    strengths: analysis.strengths,
                    weaknesses: analysis.weaknesses,
                    suggestions: analysis.suggestions,

                    missingSkills: analysis.missingSkills,
                    recommendedSkills:
                        analysis.recommendedSkills,
                        status:"COMPLETED"
                },

                create: {

                    userId: req.user.id,

                    overallScore: analysis.overallScore,

                    projectScore: analysis.projectScore,
                    technicalScore: analysis.technicalScore,
                    impactScore: analysis.impactScore,
                    experienceScore: analysis.experienceScore,
                    presentationScore: analysis.presentationScore,
                    documentationScore: analysis.documentationScore,
                    careerRelevanceScore:
                        analysis.careerRelevanceScore,

                    summary: analysis.summary,

                    strengths: analysis.strengths,
                    weaknesses: analysis.weaknesses,
                    suggestions: analysis.suggestions,

                    missingSkills: analysis.missingSkills,
                    recommendedSkills:
                        analysis.recommendedSkills,
                        status:"COMPLETED"
                }
            });


        return res.status(200).json({
            success: true,
            message: "Portfolio analyzed successfully.",
            analysis: savedAnalysis,
        });

    } catch (error) {

        console.error(
            "Portfolio analysis error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to analyze portfolio",
        });
    }
};


export const getPortfolioAnalysis = async (req, res) => {
    try {

        const analysis =
            await prisma.portfolioAnalysis.findUnique({
                where: {
                    userId: req.user.id,
                }
            });

        if (!analysis) {
            return res.status(404).json({
                success: false,
                message: "Portfolio analysis not found"
            });
        }

        return res.status(200).json({
            success: true,
            analysis,
        });

    } catch (error) {

        console.error(
            "Get portfolio analysis error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch portfolio analysis",
        });
    }
};