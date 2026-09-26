// recieves the resume from the frontend , so here we senf the data to the llm where llm gives the result of 
import  { prisma } from '../database/db.js';
import pdfParse from 'pdf-parse'
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

    // 2. Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);

    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({
        message: "Could not extract text from the resume",
      });
    }

    // 3. Send resume text to LLM
    const analysis = await analyzeWithLLM(resumeText);

    // 4. Save / update analysis
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

    // 5. Send result to frontend
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