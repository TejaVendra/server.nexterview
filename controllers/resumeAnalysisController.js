// recieves the resume from the frontend , so here we senf the data to the llm where llm gives the result of 
import  { prisma } from '../database/db.js';
import { PDFParse } from "pdf-parse";
import { analyzeWithLLM } from '../llm/service.js';

// so we dont need the sockets to it


export const analyzeResume = async (req, res) => {
  try {
    // 1. Check PDF
    if (!req.file) {
      return res.status(400).json({
        message: "Resume PDF is required",
      });
    }

    // 2. Parse PDF
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

    console.log("Extracted resume text:");
    console.log(resumeText);

    // 3. Send text to LLM
    const analysis = await analyzeWithLLM(resumeText);

    // 4. Save analysis
    const savedAnalysis = await prisma.resumeAnalysis.upsert({
      where: {
        userId: req.user.id,
      },

      update: {
        atsScore: analysis.atsScore,
        overallScore: analysis.overallScore,
        summary: analysis.summary,
        pros: analysis.pros,
        cons: analysis.cons,
        suggestions: analysis.suggestions,
        missingSkills: analysis.missingSkills,
        sectionScores: analysis.sectionScores,
        status: "COMPLETED",
      },

      create: {
        userId: req.user.id,
        atsScore: analysis.atsScore,
        overallScore: analysis.overallScore,
        summary: analysis.summary,
        pros: analysis.pros,
        cons: analysis.cons,
        suggestions: analysis.suggestions,
        missingSkills: analysis.missingSkills,
        sectionScores: analysis.sectionScores,
        status: "COMPLETED",
      },
    });

    // 5. Return result
    return res.status(200).json({
      message: "Resume analyzed successfully",
      analysis: savedAnalysis,
    });

  } catch (error) {
    console.error("Resume analysis error:", error);

    return res.status(500).json({
      message: "Failed to analyze resume",
    });
  }
};

export const getResumeAnalysis = async (req, res) => {
  try {
    const analysis = await prisma.resumeAnalysis.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!analysis) {
      return res.status(404).json({
        message: "Resume analysis not found",
      });
    }

    return res.status(200).json({
      analysis,
    });

  } catch (error) {
    console.error("Get resume analysis error:", error);

    return res.status(500).json({
      message: "Failed to fetch resume analysis",
    });
  }
};