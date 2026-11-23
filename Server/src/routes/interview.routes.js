import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { createInterview, fetchInterviews, fetchInterviewById, updateInterview, rescheduleInterview, deleteInterview } from '../controllers/interview.controller.js';

const router = Router();

router.post('/interviews', authenticateToken, createInterview);
router.get('/interviews', authenticateToken, fetchInterviews);
router.get('/interviews/:id', authenticateToken, fetchInterviewById);
router.patch('/interviews/:id', authenticateToken, updateInterview);
router.post('/interviews/:id/reschedule', authenticateToken, rescheduleInterview);
router.delete('/interviews/:id', authenticateToken, deleteInterview);

export default router;
