import express from 'express'
import { protectedRoute } from '../middleware/protected.js';
import { createMockInterview } from '../controllers/interviewController.js';

const router = express.Router();


router.post('/create-mock-interview',protectedRoute,createMockInterview);

export default router;