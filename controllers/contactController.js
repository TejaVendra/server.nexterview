import { prisma } from '../database/db.js'



export const createContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        message: "Required all fields",
        success: false,
      });
    }

    await prisma.contact.create({
      data: {
        name,
        email,
        message,
      },
    });

    return res.status(201).json({
      message:
        "Thank you for contacting us. Your message has been received, and our team will respond as soon as possible.",
      success: true,
    });
  } catch (error) {
    console.error("Error in contact controller:", error);

    return res.status(500).json({
      message:
        "We couldn’t send your message due to a server issue. Please try again later, or reach out to us through our social media channels.",
      success: false,
    });
  }
};