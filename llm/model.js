import { ChatGoogleGenerativeAI  } from '@langchain/google-genai'
import 'dotenv/config'



export const interviewLLM = new ChatGoogleGenerativeAI ({
    model:"gemini-3.6-flash",
    temperature:0.3,
    apiKey:process.env.GOOGLE_API_KEY
});
