import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { createInterview, fetchInterviews, fetchInterviewById, updateInterview } from '../controllers/interview.controller.js';

const router = Router();

router.post('/interviews', authenticateToken, createInterview);
router.get('/interviews', authenticateToken, fetchInterviews);
router.get('/interviews/:id', authenticateToken, fetchInterviewById);
router.patch('/interviews/:id', authenticateToken, updateInterview);

export default router;
