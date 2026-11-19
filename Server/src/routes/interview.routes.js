import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { createInterview, fetchInterviews } from '../controllers/interview.controller.js';

const router = Router();

router.post('/interviews', authenticateToken, createInterview);
router.get('/interviews', authenticateToken, fetchInterviews);

export default router;
