import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';

// Load environment variables
dotenv.config();

import { sessionMiddleware } from './middleware/session.js';
import sessionRouter from './routes/session.js';
import moneyRouter from './routes/money.js';
import aiRouter from './routes/ai.js';
import docRouter from './routes/document.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

// CORS setup - restricted in production, flexible in development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN || false : true,
  credentials: true,
}));

// Body limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Guest session middleware for all API routes
app.use('/api', sessionMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'KaamPe',
    version: '1.0.0',
    timestamp: Date.now(),
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5,
    session: req.sessionId,
  });
});

// Mount routes
app.use('/api/session', sessionRouter);
app.use('/api/money', moneyRouter);
app.use('/api/ai', aiRouter);
app.use('/api/document', docRouter);

// Serve static build in production
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`[KaamPe Server] Running on http://localhost:${PORT}`);
});

export default app;
