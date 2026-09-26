import { interviewLLM } from "./model.js";

export const analyzeWithLLM = async (resumeText) => {
  const prompt = `
        You are an expert resume and ATS analyzer.

        Analyze the following resume and return a detailed, objective analysis.

        Your analysis must include:

        1. ATS score from 0 to 100
        2. Overall summary
        3. Pros / strengths
        4. Cons / weaknesses
        5. Missing or weak areas
        6. Specific improvement suggestions
        7. Section-wise scores
        8. Important skills identified from the resume
        9. Potential ATS issues such as:
        - poor formatting
        - missing keywords
        - weak section headings
        - lack of measurable achievements
        - unnecessary information
        - missing contact information
        10. A concise final recommendation

        Return ONLY valid JSON matching this structure:

        {
        "atsScore": 0,
        "summary": "",
        "pros": [],
        "cons": [],
        "missingAreas": [],
        "suggestions": [],
        "skills": [],
        "atsIssues": [],
        "sectionScores": {
            "contact": 0,
            "summary": 0,
            "skills": 0,
            "experience": 0,
            "projects": 0,
            "education": 0
        },
        "finalRecommendation": ""
        }

        Rules:
        - All scores must be between 0 and 100.
        - Base the analysis only on the resume provided.
        - Do not invent experience, skills, education, or achievements.
        - Give specific and actionable feedback.
        - Return JSON only.

        RESUME:
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