import express from 'express'
import { protectedRoute } from '../middleware/protected.js';
import { createMockInterview, getMockInterview, mockInterviews, startMockInterview ,getMockInterviewResult } from '../controllers/interviewController.js';


const router = express.Router();


router.post('/create-mock-interview',protectedRoute,createMockInterview);
router.get('/:id',protectedRoute,getMockInterview);
router.post("/:id/start",protectedRoute,startMockInterview);
router.get("/user/mockinterviews",protectedRoute,mockInterviews);
router.get("/mock-interview/:id/result",protectedRoute,getMockInterviewResult);


export default router;