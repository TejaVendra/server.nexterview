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




export const analyzePortfolioWithLLM = async (text) => {
  const prompt = `
      You are an expert software engineering career advisor, technical recruiter,
      and portfolio reviewer.

      Your task is to analyze a developer's portfolio content and provide an
      objective, practical, and actionable evaluation.

      Analyze ONLY the information provided in the portfolio content.
      Do not invent projects, technologies, experience, achievements, or results
      that are not present in the content.

      Evaluate the portfolio across these categories:

      1. Projects
        - Project quality
        - Complexity
        - Technical depth
        - Real-world usefulness
        - Variety

      2. Technical Skills
        - Technologies demonstrated through projects
        - Backend/frontend/database/cloud/AI skills where applicable
        - Whether the claimed skills are supported by actual projects

      3. Impact
        - Measurable results
        - Real-world value
        - Problem-solving ability
        - Use of metrics and outcomes

      4. Experience
        - Internships
        - Work experience
        - Open-source contributions
        - Relevant professional experience

      5. Presentation
        - Clarity
        - Structure
        - Professionalism
        - Readability
        - Quality of portfolio descriptions

      6. Documentation
        - Project explanations
        - README/documentation
        - Setup instructions
        - Architecture explanations
        - Live demos and GitHub links if mentioned

      7. Career Relevance
        - Relevance of the portfolio to software engineering roles
        - Relevance to the technologies and roles indicated by the portfolio

      SCORING:

      Give every category a score from 0 to 100.

      Calculate an overallScore from the category scores.

      Do NOT give a score simply because a technology is mentioned.
      Evaluate whether the portfolio provides evidence of that skill.

      FEEDBACK:

      Provide:

      - summary: A concise overall assessment.
      - strengths: The strongest aspects of the portfolio.
      - weaknesses: Specific areas that reduce the portfolio's effectiveness.
      - suggestions: Concrete actions the user can take to improve it.
      - missingSkills: Skills that appear relevant but are missing or insufficiently demonstrated.
      - recommendedSkills: Skills that would strengthen the portfolio based on the roles/projects shown.

      IMPORTANT:

      - Be honest and constructive.
      - Do not use vague statements such as "make it better".
      - Every weakness should lead to an actionable suggestion.
      - Do not invent information.
      - Do not assume the user has experience that is not mentioned.
      - If information is missing, explicitly treat it as missing rather than assuming it exists.
      - Scores should reflect the evidence available in the portfolio.
      - Return ONLY valid JSON.
      - Do not use Markdown.
      - Do not add explanations outside the JSON.

      
       DO NOT:
            - use markdown
            - use code fences
            - write \`\`\`json
            - write explanations outside the JSON
            - add any text before or after the JSON

      Return exactly this structure:

      {
        "overallScore": 0,

        "projectScore": 0,
        "technicalScore": 0,
        "impactScore": 0,
        "experienceScore": 0,
        "presentationScore": 0,
        "documentationScore": 0,
        "careerRelevanceScore": 0,

        "summary": "",

        "strengths": [
          ""
        ],

        "weaknesses": [
          ""
        ],

        "suggestions": [
          ""
        ],

        "missingSkills": [
          ""
        ],

        "recommendedSkills": [
          ""
        ]
      }

      Portfolio content:

      ${text}
      `;

      try {
        const response = await interviewLLM.invoke(prompt);

        const content = response.content;

        return JSON.parse(content);

      } catch (error) {
        console.error("Portfolio analysis failed:", error);
        throw new Error("Failed to analyze portfolio");
      }


};