import { Router } from 'express';
import { createCompany, fetchCompanies, fetchCompanyById, updateCompany, deleteCompany } from '../controllers/company.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/companies', authenticateToken, createCompany);
router.get('/companies', authenticateToken, fetchCompanies);
router.get('/companies/:id', authenticateToken, fetchCompanyById);
router.patch('/companies/:id', authenticateToken, updateCompany);
router.delete('/companies/:id', authenticateToken, deleteCompany);

export default router;