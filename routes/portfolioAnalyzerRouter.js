import express from 'express'
import { protectedRoute } from '../middleware/protected.js';
import { analyzePortfolio, getPortfolioAnalysis } from '../controllers/portfolioAnalyzerController.js';


const router = express.Router();


router.post("/analyze",protectedRoute,analyzePortfolio);
router.get("/analyze/result",protectedRoute,getPortfolioAnalysis);

export default router;