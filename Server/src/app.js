import express from 'express';
import applicationRoutes from './routes/application.routes.js';
import { healthCheck } from './controllers/application.controller.js';
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';

export const app = express();
app.use(express.json());

app.get('/health', healthCheck);
app.use('/api/auth', authRoutes);
app.use('/api', applicationRoutes);
app.use('/api', companyRoutes);
