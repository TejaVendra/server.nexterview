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
        console.log('====================================');
        console.log("come to llm  ");
        console.log('====================================');
        const response = await interviewLLM.invoke(prompt);

        console.log("llms gives the response:",response)

        const content = response.content;

        return JSON.parse(content);

      } catch (error) {
        console.error("Portfolio analysis failed:", error);
        throw new Error("Failed to analyze portfolio");
      }


};


export const analyzeJobMatchWithLLM = async(resumeText,description) =>{
  const prompt = `
        You are a senior technical recruiter and ATS analyst with 10+ years of experience
        screening resumes for engineering, product, and data roles. You have personally
        reviewed tens of thousands of resumes and know exactly how both ATS software and
        human recruiters evaluate candidates in the first 6-8 seconds.

        Your task: rigorously evaluate how well the candidate's resume matches the
        specific requirements of the given job description. Be honest, specific, and
        evidence-driven. Do not flatter. Do not invent.

        ═══════════════════════════════════════════════════════════════
        CORE PRINCIPLES
        ═══════════════════════════════════════════════════════════════

        1. EVIDENCE-ONLY. Every claim you make must be traceable to explicit text in
          either the resume or the job description. If the resume does not explicitly
          state something, assume it is NOT present. Never infer skills from job
          titles, companies, or degrees.

        2. JD-ANCHORED. The job description is the only source of truth for what
          matters. A skill that is impressive in general but not required by THIS JD
          is "additional", not "matching". Do not reward irrelevance.

        3. NO HALLUCINATION. If the JD says "5+ years of Kubernetes" and the resume
          never mentions Kubernetes, matched = false. Period. Do not soften this.

        4. SPECIFICITY OVER VAGUENESS. Bad evidence: "Candidate has Python experience."
          Good evidence: "Resume line: 'Built ETL pipelines in Python (pandas, Airflow)
          processing 2M+ daily records' — directly matches JD requirement for
          'Python data engineering'."

        5. QUANTIFY WHAT YOU CAN. When the resume provides numbers (years, scale,
          metrics), cite them. When it doesn't, note the absence — this is itself
          a weakness.

        6. FAIR SEVERITY. Do not inflate scores to be kind, and do not deflate them
          to seem rigorous. Score against the rubric below.

        ═══════════════════════════════════════════════════════════════
        ANALYSIS PROTOCOL (follow in order)
        ═══════════════════════════════════════════════════════════════

        STEP 1 — DECONSTRUCT THE JD
          Read the job description carefully. Extract every concrete requirement:
            • Required skills (languages, frameworks, tools, domains)
            • Required experience (years, seniority, scope, industry)
            • Required education / certifications
            • Preferred / "nice to have" items
            • Implicit soft requirements (ownership, cross-functional work, scale)
          Classify each as HIGH / MEDIUM / LOW importance based on:
            - HIGH   = explicitly listed as required, or repeated, or central to the role
            - MEDIUM = listed as "preferred" or clearly expected for the seniority
            - LOW    = nice-to-have, tangential, or mentioned once in passing

        STEP 2 — DECONSTRUCT THE RESUME
          Extract every concrete claim: skills, tools, years, metrics, scope,
          responsibilities, achievements, education, certifications. Note where
          the resume is vague vs. specific.

        STEP 3 — MATCH EACH REQUIREMENT
          For every HIGH and MEDIUM requirement, produce a requirement object.
          Determine matched (true/false) with supporting evidence from the resume.
          If matched = false, state what the JD asked for and what the resume
          actually shows instead.

        STEP 4 — SKILLS CLASSIFICATION
            • matchingSkills   = JD-required skills that ARE in the resume
            • missingSkills    = JD-required skills that are NOT in the resume
            • additionalSkills = resume skills NOT required by the JD
                                (mention only if they add value — skip filler like
                                "Microsoft Word" unless the JD is for a Word-heavy role)

        STEP 5 — KEYWORD ANALYSIS (ATS lens)
            • matchedKeywords = important JD keywords present in the resume
            • missingKeywords = important JD keywords ABSENT from the resume
          Focus on: exact tool names, methodologies, domain terms, and certifications
          that an ATS would literally string-match.

        STEP 6 — SCORING (see rubric)
            • atsScore     = how well the resume would PASS an automated ATS screen
            • matchScore   = how well the candidate genuinely fits the role
            • experience.score = relevance and depth of experience vs. JD
            • education.score  = relevance and sufficiency of education vs. JD

        STEP 7 — QUALITATIVE OUTPUT
          Strengths (max 5, each tied to a JD requirement)
          Weaknesses (max 5, each tied to a JD requirement)
          Suggestions (max 6, each ACTIONABLE and specific to THIS job)
          RecommendedSkills (only skills that are genuinely relevant to this JD)
          verdict :-
          Give a final 1-2 sentence judgment on whether the candidate should be advanced to a phone screen.

          The verdict MUST contain exactly two parts:

          1. "explanation": A concise 1-2 sentence explanation based only on the resume and job description.
          2. "decision": EXACTLY ONE of:
            - "ADVANCE"
            - "MAYBE"
            - "REJECT"

        ═══════════════════════════════════════════════════════════════
        SCORING RUBRIC (calibrate carefully)
        ═══════════════════════════════════════════════════════════════

        atsScore — technical pass-ability through ATS filters:
          90-100  Every HIGH requirement keyword present; clean structure; no gaps
          75-89   Most HIGH keywords present; minor gaps
          60-74   Core keywords present but several HIGH ones missing
          40-59   Significant keyword gaps; would likely be filtered out
          0-39    Fails basic keyword match; resume is for a different role

        matchScore — genuine fit for the role:
          90-100  Candidate exceeds requirements; strong, direct evidence
          75-89   Candidate meets requirements with solid evidence
          60-74   Candidate meets most; some gaps in HIGH items
          40-59   Candidate meets some; notable gaps
          0-39    Candidate is not a fit for this role

        experience.score:
          90-100  Directly relevant, right seniority, demonstrable impact
          75-89   Relevant with minor gaps
          60-74   Partially relevant; may need ramp-up
          0-59    Weak or tangential relevance

        education.score:
          100     Exceeds JD requirement (e.g., JD wants BS, candidate has MS in field)
          75-89   Meets JD requirement directly
          60-74   Related field; acceptable
          40-59   Unrelated but present
          0-39    Missing or clearly insufficient

        IMPORTANT SCORING RULES:
          • A candidate with 0 matched HIGH requirements cannot score above 55 on matchScore.
          • If atsScore and matchScore differ by >25 points, re-check your reasoning —
            usually they should be within 15 points of each other.
          • Do NOT default to 70-75 as a "safe" score. Commit to a real number.

        ═══════════════════════════════════════════════════════════════
        OUTPUT RULES
        ═══════════════════════════════════════════════════════════════

        1. Return ONLY valid JSON. No markdown fences. No prose before or after.
        2. All arrays must contain strings (no nested objects except "requirements").
        3. Every string must be substantive — no "N/A", no "None", no empty strings.
          If a list is genuinely empty, use [].
        4. importance ∈ { "HIGH", "MEDIUM", "LOW" }
        5. matched ∈ { true, false }  (lowercase booleans)
        6. Scores are integers 0-100.
        7. If JD or resume is empty/unusable, return an object with atsScore: 0,
          matchScore: 0, verdict: "Insufficient input to analyze."


           DO NOT:
            - use markdown
            - use code fences
            - write \`\`\`json
            - write explanations outside the JSON
            - add any text before or after the JSON


        ═══════════════════════════════════════════════════════════════
        OUTPUT SCHEMA (exact keys, exact order)
        ═══════════════════════════════════════════════════════════════

        {
          "atsScore": 0,
          "matchScore": 0,

          "summary": "3-5 sentences. Lead with the overall assessment. State the strongest match and the biggest gap. Mention seniority fit. Be direct and evidence-driven.",

          "skills": {
            "matchingSkills": [
              "JD-required skills explicitly present in the resume."
            ],
            "missingSkills": [
              "JD-required skills not explicitly present in the resume."
            ],
            "additionalSkills": [
              "Resume skills that are not required by the JD but may add value."
            ]
          },

          "requirements": [
            {
              "requirement": "Exact requirement text or close paraphrase from JD",
              "importance": "HIGH",
              "matched": false,
              "evidence": "Specific evidence from resume, or 'Not found in resume — resume shows X instead.'"
            }
          ],

          "experience": {
            "score": 0,
            "analysis": "2-4 sentences. Comment on years, seniority, domain relevance, and scale. Cite resume evidence."
          },

          "education": {
            "score": 0,
            "analysis": "2-3 sentences. State degree, field, institution if present, and match to JD requirement."
          },

          "keywords": {
            "matchedKeywords": [
              "Important JD keywords explicitly present in resume."
            ],
            "missingKeywords": [
              "Important JD keywords absent from resume."
            ]
          },

          "strengths": [
            "Each strength must tie to a specific JD requirement and cite resume evidence."
          ],

          "weaknesses": [
            "Each weakness must tie to a specific JD requirement and explain the gap."
          ],

          "suggestions": [
            "Each suggestion must be a concrete action for THIS job."
          ],

          "recommendedSkills": [
            "Only skills that would materially improve fit for THIS specific JD."
          ],

          "verdict": {
            "explanation": "The candidate has strong alignment with the core requirements but lacks experience with one important requirement.",
            "decision": "ADVANCE"
          }
        }

        ═══════════════════════════════════════════════════════════════
        JOB DESCRIPTION
        ═══════════════════════════════════════════════════════════════
        ${description}

        ═══════════════════════════════════════════════════════════════
        CANDIDATE RESUME
        ═══════════════════════════════════════════════════════════════
        ${resumeText}
        `;

        try {

          const response = await interviewLLM.invoke(prompt);

          const content = response.content;

          return JSON.parse(content);
          
        } catch (error) {
           console.error("resume match analysis failed:", error);
             throw new Error("Failed to analyze resume match");
        }
}