import express from 'express'
import { analyzeResume, getResumeAnalysis}  from '../controllers/resumeAnalysisController.js';
import { protectedRoute }  from '../middleware/protected.js'
import upload from '../middleware/uploadFile.js';

const router = express.Router();


router.post("/analysis",protectedRoute, upload.single("resume"),analyzeResume);
router.get(
  "/analysis",
  protectedRoute,
  getResumeAnalysis
);








export default router;