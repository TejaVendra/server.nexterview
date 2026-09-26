import { interviewLLM } from "./model.js";

export const analyzeWithLLM = async (resumeText) => {
 const prompt = `
You are an expert resume and ATS analyzer.

Analyze the following resume.

Return ONLY a valid JSON object.

DO NOT:
- use markdown
- use code fences
- write \`\`\`json
- write explanations outside the JSON
- add any text before or after the JSON

The JSON must have exactly this structure:

{
  "atsScore": 0,
  "overallScore": 0,
  "summary": "",
  "pros": [],
  "cons": [],
  "suggestions": [],
  "missingSkills": [],
  "sectionScores": {
    "contact": 0,
    "summary": 0,
    "education": 0,
    "experience": 0,
    "skills": 0,
    "projects": 0,
    "formatting": 0
  }
}

Rules:
- atsScore must be between 0 and 100.
- overallScore must be between 0 and 100.
- section scores must be between 0 and 100.
- pros must be an array of strings.
- cons must be an array of strings.
- suggestions must be an array of strings.
- missingSkills must be an array of strings.
- Do not invent information that is not present in the resume.

Resume:
${resumeText}
`;

  try {
    const response = await interviewLLM.invoke(prompt);

    const content = response.content;

    return JSON.parse(content);

  } catch (error) {
    console.error("Resume analysis failed:", error);
    throw new Error("Failed to analyze resume");
  }
};