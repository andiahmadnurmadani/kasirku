import morgan from 'morgan';
import { Request, Response } from 'express';

// Definisi token kustom untuk morgan agar log rapi & mudah dibaca
morgan.token('body', (req: Request) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const cloned = { ...req.body };
    // Sembunyikan field yang terlalu panjang jika perlu
    return JSON.stringify(cloned).slice(0, 150);
  }
  return '';
});

morgan.token('timestamp', () => {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
});

// Format logging dev / production
const morganFormat = process.env.NODE_ENV === 'production'
  ? '[:timestamp] :remote-addr - :method :url :status :res[content-length] - :response-time ms'
  : '[:timestamp] :method :url :status - :response-time ms :body';

export const httpLogger = morgan(morganFormat);

