import express from 'express'
import {protectedRoute} from '../middleware/protected.js'
import { getAnalysisScores } from '../controllers/dashboardController.js';

const router = express.Router();


router.get("/analysis/score",protectedRoute,getAnalysisScores);


export default router;