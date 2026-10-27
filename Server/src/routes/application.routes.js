import { Router } from 'express';
import { fetchApplications, createApplication } from '../controllers/application.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { updateApplication } from '../controllers/application.controller.js';
import {deleteApplication} from '../controllers/application.controller.js';

const router = Router();

router.get('/applications', authenticateToken, fetchApplications);
router.post('/applications', authenticateToken, createApplication);
router.patch('/applications/:id', authenticateToken, updateApplication);
router.delete('/applications/:id', authenticateToken, deleteApplication);

export default router;