import { Router, Response } from 'express';
import { prisma } from '../index';
import { LexoRank } from 'lexorank';
import { authenticateGuest, AuthRequest } from '../middleware/auth';

const router = Router();

// Create a card
router.post('/', authenticateGuest, async (req: AuthRequest, res: Response) => {
  const { listId, title, content } = req.body;
  const guestId = req.guestId!;

  try {
    const lastCard = await prisma.card.findFirst({
      where: { listId: parseInt(listId) },
      orderBy: { position: 'desc' }
    });

    let newPosition = LexoRank.middle().toString();
    if (lastCard) {
      newPosition = LexoRank.parse(lastCard.position).genNext().toString();
    }

    const card = await prisma.card.create({
      data: {
        title,
        content,
        listId: parseInt(listId),
        position: newPosition,
        creatorId: guestId
      },
      include: { creator: true }
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card position
router.put('/:id/position', authenticateGuest, async (req: AuthRequest, res: Response): Promise<any> => {
  const { position, listId } = req.body;
  const guestId = req.guestId!;

  try {
    const card = await prisma.card.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    if (card.creatorId !== guestId && req.nickname !== 'Administrator01') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own card' });
    }

    const updatedCard = await prisma.card.update({
      where: { id: card.id },
      data: { 
        position,
        ...(listId && { listId: parseInt(listId) })
      }
    });
    res.json(updatedCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card position' });
  }
});

// Update card content
router.put('/:id', authenticateGuest, async (req: AuthRequest, res: Response): Promise<any> => {
  const { title, content } = req.body;
  const guestId = req.guestId!;

  try {
    const card = await prisma.card.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    if (card.creatorId !== guestId && req.nickname !== 'Administrator01') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own card' });
    }

    const updatedCard = await prisma.card.update({
      where: { id: card.id },
      data: { title, content }
    });
    res.json(updatedCard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card
router.delete('/:id', authenticateGuest, async (req: AuthRequest, res: Response): Promise<any> => {
  const guestId = req.guestId!;
  try {
    const card = await prisma.card.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    if (card.creatorId !== guestId && req.nickname !== 'Administrator01') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own card' });
    }

    await prisma.card.delete({
      where: { id: card.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

export default router;
