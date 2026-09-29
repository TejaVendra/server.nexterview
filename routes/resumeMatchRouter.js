import express from 'express'
import { protectedRoute } from '../middleware/protected.js'
import  upload from '../middleware/uploadFile.js'
import { analyzeResumeMatch , getResumeMatchAnalysis} from '../controllers/resumeMatchContoller.js'



const router = express.Router();


router.post("/analyze",protectedRoute,upload.single("resume-2"),analyzeResumeMatch);
router.get("/analyze/result",protectedRoute,getResumeMatchAnalysis);





export default router;