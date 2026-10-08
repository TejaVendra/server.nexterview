
import { prisma } from "../database/db.js";
import { givesTheBetterContext } from "../llm/service.js";




const cleanString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
};

const isValidDate = (value) => {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};


export const getResumeMakerDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const resume = await prisma.resume.findUnique({
      where: {
        userId,
      },

      include: {
        skills: true,

        experiences: {
          orderBy: {
            startDate: "desc",
          },
        },

        educations: {
          orderBy: {
            startDate: "desc",
          },
        },

        projects: {
          include: {
            technologies: true,
          },
        },

        certifications: {
          orderBy: {
            issueDate: "desc",
          },
        },
      },
    });

    /*
     * User does not have a resume yet.
     */

    if (!resume) {
      return res.status(200).json({
        resume: null,
      });
    }

    return res.status(200).json({
      resume,
    });
  } catch (error) {
    console.error(
      "Error getting resume maker details:",
      error
    );

    return res.status(500).json({
      message: "Failed to retrieve resume",
    });
  }
};


export const saveResumeMaker = async (req, res) => {
  try {
    const userId = req.user.id;

    /*
    |--------------------------------------------------------------------------
    | Get request body
    |--------------------------------------------------------------------------
    */

    const {
      title,
      name,
      summary,
      phone,
      location,
      linkedin,
      github,
      portfolio,

      skills = [],
      experiences = [],
      educations = [],
      projects = [],
      certifications = [],
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Basic validation
    |--------------------------------------------------------------------------
    */

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        message: "Skills must be an array",
      });
    }

    if (!Array.isArray(experiences)) {
      return res.status(400).json({
        message: "Experiences must be an array",
      });
    }

    if (!Array.isArray(educations)) {
      return res.status(400).json({
        message: "Educations must be an array",
      });
    }

    if (!Array.isArray(projects)) {
      return res.status(400).json({
        message: "Projects must be an array",
      });
    }

    if (!Array.isArray(certifications)) {
      return res.status(400).json({
        message: "Certifications must be an array",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate template
    |--------------------------------------------------------------------------
    */



    /*
    |--------------------------------------------------------------------------
    | Validate experiences
    |--------------------------------------------------------------------------
    */

    for (const experience of experiences) {
      if (
        !experience.company?.trim() ||
        !experience.position?.trim()
      ) {
        return res.status(400).json({
          message:
            "Each experience must have company and position",
        });
      }

      if (
        !experience.startDate ||
        !isValidDate(experience.startDate)
      ) {
        return res.status(400).json({
          message:
            "Each experience must have a valid start date",
        });
      }

      if (
        experience.endDate &&
        !isValidDate(experience.endDate)
      ) {
        return res.status(400).json({
          message:
            "Experience contains an invalid end date",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate education
    |--------------------------------------------------------------------------
    */

    for (const education of educations) {
      if (
        !education.institution?.trim() ||
        !education.degree?.trim()
      ) {
        return res.status(400).json({
          message:
            "Each education must have institution and degree",
        });
      }

      if (
        education.startDate &&
        !isValidDate(education.startDate)
      ) {
        return res.status(400).json({
          message:
            "Education contains an invalid start date",
        });
      }

      if (
        education.endDate &&
        !isValidDate(education.endDate)
      ) {
        return res.status(400).json({
          message:
            "Education contains an invalid end date",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate projects
    |--------------------------------------------------------------------------
    */

    for (const project of projects) {
      if (!project.name?.trim()) {
        return res.status(400).json({
          message: "Every project must have a name",
        });
      }

      if (
        project.technologies &&
        !Array.isArray(project.technologies)
      ) {
        return res.status(400).json({
          message:
            "Project technologies must be an array",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate certifications
    |--------------------------------------------------------------------------
    */

    for (const certification of certifications) {
      if (!certification.name?.trim()) {
        return res.status(400).json({
          message:
            "Every certification must have a name",
        });
      }

      if (
        certification.issueDate &&
        !isValidDate(certification.issueDate)
      ) {
        return res.status(400).json({
          message:
            "Certification contains an invalid issue date",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ATOMIC TRANSACTION
    |--------------------------------------------------------------------------
    |
    | Everything below either succeeds together or rolls back.
    |
    */

    const result = await prisma.$transaction(
      async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | 1. Create or update Resume
        |--------------------------------------------------------------------------
        */

        const resume = await tx.resume.upsert({
          where: {
            userId,
          },

          create: {
            userId,

            title: cleanString(title),
            name: cleanString(name),


            summary: cleanString(summary),

            phone: cleanString(phone),
            location: cleanString(location),
            linkedin: cleanString(linkedin),
            github: cleanString(github),
            portfolio: cleanString(portfolio),
          },

          update: {
            title: cleanString(title),
            name: cleanString(name),

  

            summary: cleanString(summary),

            phone: cleanString(phone),
            location: cleanString(location),
            linkedin: cleanString(linkedin),
            github: cleanString(github),
            portfolio: cleanString(portfolio),
          },
        });

        /*
        |--------------------------------------------------------------------------
        | 2. Replace Skills
        |--------------------------------------------------------------------------
        */

        await tx.skill.deleteMany({
          where: {
            resumeId: resume.id,
          },
        });

        const validSkills = skills
          .filter((skill) => skill?.name?.trim())
          .map((skill) => ({
            name: skill.name.trim(),
            resumeId: resume.id,
          }));

        if (validSkills.length > 0) {
          await tx.skill.createMany({
            data: validSkills,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Replace Experiences
        |--------------------------------------------------------------------------
        */

        await tx.experience.deleteMany({
          where: {
            resumeId: resume.id,
          },
        });

        const validExperiences = experiences
          .filter(
            (experience) =>
              experience?.company?.trim() &&
              experience?.position?.trim() &&
              experience?.startDate
          )
          .map((experience) => ({
            resumeId: resume.id,

            company: experience.company.trim(),

            position: experience.position.trim(),

            location: cleanString(
              experience.location
            ),

            startDate: parseDate(
              experience.startDate
            ),

            endDate: parseDate(
              experience.endDate
            ),

            description: cleanString(
              experience.description
            ),
          }));

        if (validExperiences.length > 0) {
          await tx.experience.createMany({
            data: validExperiences,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 4. Replace Education
        |--------------------------------------------------------------------------
        */

        await tx.education.deleteMany({
          where: {
            resumeId: resume.id,
          },
        });

        const validEducations = educations
          .filter(
            (education) =>
              education?.institution?.trim() &&
              education?.degree?.trim()
          )
          .map((education) => ({
            resumeId: resume.id,

            institution:
              education.institution.trim(),

            degree: education.degree.trim(),

            field: cleanString(
              education.field
            ),

            startDate: parseDate(
              education.startDate
            ),

            endDate: parseDate(
              education.endDate
            ),

            grade: cleanString(
              education.grade
            ),
          }));

        if (validEducations.length > 0) {
          await tx.education.createMany({
            data: validEducations,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 5. Replace Projects
        |--------------------------------------------------------------------------
        */

        await tx.project.deleteMany({
          where: {
            resumeId: resume.id,
          },
        });

        for (const project of projects) {
          if (!project?.name?.trim()) {
            continue;
          }

          const technologies = Array.isArray(
            project.technologies
          )
            ? project.technologies
                .filter(
                  (technology) =>
                    technology?.name?.trim()
                )
                .map((technology) => ({
                  name: technology.name.trim(),
                }))
            : [];

          await tx.project.create({
            data: {
              resumeId: resume.id,

              name: project.name.trim(),

              description: cleanString(
                project.description
              ),

              githubUrl: cleanString(
                project.githubUrl
              ),

              liveUrl: cleanString(
                project.liveUrl
              ),

              technologies: {
                create: technologies,
              },
            },
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 6. Replace Certifications
        |--------------------------------------------------------------------------
        */

        await tx.certification.deleteMany({
          where: {
            resumeId: resume.id,
          },
        });

        const validCertifications =
          certifications
            .filter(
              (certification) =>
                certification?.name?.trim()
            )
            .map((certification) => ({
              resumeId: resume.id,

              name: certification.name.trim(),

              issuer: cleanString(
                certification.issuer
              ),

              issueDate: parseDate(
                certification.issueDate
              ),

              credentialUrl: cleanString(
                certification.credentialUrl
              ),
            }));

        if (validCertifications.length > 0) {
          await tx.certification.createMany({
            data: validCertifications,
          });
        }

        /*
        |--------------------------------------------------------------------------
        | 7. Return complete resume from transaction
        |--------------------------------------------------------------------------
        */

        const savedResume =
          await tx.resume.findUnique({
            where: {
              id: resume.id,
            },

            include: {
              skills: true,

              experiences: {
                orderBy: {
                  startDate: "desc",
                },
              },

              educations: {
                orderBy: {
                  startDate: "desc",
                },
              },

              projects: {
                include: {
                  technologies: true,
                },
              },

              certifications: {
                orderBy: {
                  issueDate: "desc",
                },
              },
            },
          });

        return savedResume;
      },

      /*
      |--------------------------------------------------------------------------
      | Transaction configuration
      |--------------------------------------------------------------------------
      */

      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      message: "Resume saved successfully",

      resume: result,
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Prisma errors
    |--------------------------------------------------------------------------
    */

    console.error(
      "Error saving resume maker:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | Transaction timeout
    |--------------------------------------------------------------------------
    */

    if (error?.code === "P2028") {
      return res.status(503).json({
        message:
          "Resume could not be saved because the database is temporarily busy. Please try again.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | General error
    |--------------------------------------------------------------------------
    */

    return res.status(500).json({
      message: "Failed to save resume",
    });
  }
};




export const getBetterContext = async (req, res) => {
  try {
    const { text, type } = req.body;

    if (
      !text ||
      typeof text !== "string" ||
      !text.trim()
    ) {
      return res.status(400).json({
        message: "text is required.",
      });
    }

    if (!type) {
      return res.status(400).json({
        message: "type is required.",
      });
    }

    const generatedText = await givesTheBetterContext(
      text,
      type
    );

    return res.status(200).json({
      generatedText,
    });
  } catch (error) {
    console.error(
      "Error in getBetterContext controller:",
      error
    );

    return res.status(500).json({
      message: "Failed to generate better context",
    });
  }
};
