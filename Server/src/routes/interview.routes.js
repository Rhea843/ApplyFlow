import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { createInterview } from '../controllers/interview.controller.js';

const router = Router();

router.post('/interviews', authenticateToken, createInterview);

export default router;
