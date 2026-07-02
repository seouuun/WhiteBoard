import { Router } from 'express';
import { prisma } from '../index';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

const router = Router();

// Set nickname and get guest token
router.post('/guest', async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
    return res.status(400).json({ error: 'Valid nickname is required' });
  }

  try {
    let guest = await prisma.guest.findFirst({
      where: { nickname: nickname.trim() }
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: { nickname: nickname.trim() }
      });
    }

    const token = jwt.sign(
      { guestId: guest.id, nickname: guest.nickname },
      JWT_SECRET,
      // Optional: you can set an expiration, e.g., { expiresIn: '7d' }
    );

    res.json({ token, guest });
  } catch (error) {
    console.error('Auth error', error);
    res.status(500).json({ error: 'Failed to authenticate guest' });
  }
});

export default router;
