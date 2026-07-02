import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-whiteboard';

export interface AuthRequest extends Request {
  guestId?: string;
  nickname?: string;
}

export const authenticateGuest = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { guestId: string, nickname: string };
    req.guestId = decoded.guestId;
    req.nickname = decoded.nickname;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or invalid' });
  }
};

// Optional auth for reading boards (so guests without token can still read)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { guestId: string, nickname: string };
      req.guestId = decoded.guestId;
      req.nickname = decoded.nickname;
    } catch (err) {
      // ignore invalid token for optional auth
    }
  }
  next();
};
