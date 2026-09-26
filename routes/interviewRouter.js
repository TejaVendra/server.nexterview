import express from 'express'
import { protectedRoute } from '../middleware/protected.js';
import { createMockInterview, getMockInterview, startMockInterview } from '../controllers/interviewController.js';

const router = express.Router();


router.post('/create-mock-interview',protectedRoute,createMockInterview);
router.get('/:id',protectedRoute,getMockInterview);
router.post("/:id/start",protectedRoute,startMockInterview);


export default router;