import express from 'express';
import applicationRoutes from './routes/application.routes.js';
import { healthCheck } from './controllers/application.controller.js';
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';

const app = express();
app.use(express.json());

app.get('/health', healthCheck);
app.use('/api/auth', authRoutes);
app.use('/api', applicationRoutes);
app.use('/api', companyRoutes);

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});