import express from 'express'
import { analyzeResume } from '../controllers/resumeAnalysisController.js';
import {protectedRoute }  from '../middleware/protected.js'
import upload from '../middleware/uploadFile.js';

const router = express.Router();


router.post("/analysis",protectedRoute,upload,analyzeResume);








export default router;