import { prisma } from "../database/db.js";
import { analyzeJobMatchWithLLM } from "../llm/service.js";
import { PDFParse } from "pdf-parse";

export const analyzeResumeMatch = async (req, res) => {
    try {


        if (!req.file) {
            return res.status(400).json({
                message: "Resume PDF is required",
            });
        }


        const { description } = req.body;

        if (!description || description.trim().length === 0) {
            return res.status(400).json({
                message: "Job description is required",
            });
        }



        const parser = new PDFParse({
            data: req.file.buffer,
        });

        const result = await parser.getText();

        const resumeText = result.text;

        await parser.destroy();

        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(400).json({
                message: "Could not extract text from the resume",
            });
        }


        console.log("Starting resume match analysis...");

        const analysis = await analyzeJobMatchWithLLM(
            resumeText,
            description.trim()
        );

        console.log("Resume analysis completed.");



        const verdictExplanation =
            analysis.verdict?.explanation || "";

        const verdictDecision =
            analysis.verdict?.decision;

        const validVerdicts = [
            "ADVANCE",
            "MAYBE",
            "REJECT",
        ];

        if (!validVerdicts.includes(verdictDecision)) {
            return res.status(500).json({
                message: "Invalid verdict returned by AI",
            });
        }


       const analysisResult = await prisma.resumeMatchAnalysis.upsert({
    where: {
        userId: req.user.id,
    },

    update: {
        atsScore: analysis.atsScore,
        matchScore: analysis.matchScore,
        summary: analysis.summary,

        skills: analysis.skills,
        requirements: analysis.requirements,
        experience: analysis.experience,
        education: analysis.education,
        keywords: analysis.keywords,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        recommendedSkills: analysis.recommendedSkills,

        // IMPORTANT
        verdict: analysis.verdict.decision,
        verdictExplanation: analysis.verdict.explanation,

        status: "COMPLETED",
    },

    create: {
        userId: req.user.id,

        atsScore: analysis.atsScore,
        matchScore: analysis.matchScore,
        summary: analysis.summary,

        skills: analysis.skills,
        requirements: analysis.requirements,
        experience: analysis.experience,
        education: analysis.education,
        keywords: analysis.keywords,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        recommendedSkills: analysis.recommendedSkills,

        // IMPORTANT
        verdict: analysis.verdict.decision,
        verdictExplanation: analysis.verdict.explanation,

        status: "COMPLETED",
    },
});



        return res.status(200).json({
            message: "Resume match analyzed successfully",
            analysis: analysisResult,
        });

    } catch (error) {

        console.error(
            "Error in resume match analysis controller:",
            error
        );

        return res.status(500).json({
            message: "Failed to analyze resume match",
        });
    }
};



export const getResumeMatchAnalysis = async (req, res) => {

    try {

        const analysis =
            await prisma.resumeMatchAnalysis.findUnique({

                where: {
                    userId: req.user.id,
                },
            });

        if (!analysis) {

            return res.status(404).json({
                message: "Analysis not found",
            });
        }

        return res.status(200).json({
            analysis,
        });

    } catch (error) {

        console.error(
            "Error in get resume match analysis controller:",
            error
        );

        return res.status(500).json({
            message: "Failed to get the analysis",
        });
    }
};