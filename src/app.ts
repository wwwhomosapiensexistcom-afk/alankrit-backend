import express, { Request, Response } from 'express';
import path from 'path';
import './config/env';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import customerRoutes from './routes/customers';
import inventoryRoutes from './routes/inventory';
import uploadRoutes from './routes/upload';
import goldRateRoutes from './routes/goldRates';
import categoryRoutes from './routes/categories';
import discountRoutes from './routes/discounts';
import paymentRoutes from './routes/payment';
import heroRoutes from './routes/heroes';
import customOrderRoutes from './routes/customOrders';

const app = express();

app.use(compression());

if (process.env.NODE_ENV === 'production') {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'http://localhost:3001'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
}

app.use(corsMiddleware);
// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/gold', goldRateRoutes);
app.use('/api/gold-rates', goldRateRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/heroes', heroRoutes);
app.use('/api/custom-orders', customOrderRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server running', timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

export default app;
