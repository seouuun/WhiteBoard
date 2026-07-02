import { Router, Response } from 'express';
import { prisma } from '../index';
import { LexoRank } from 'lexorank';
import { authenticateGuest, AuthRequest } from '../middleware/auth';

const router = Router();

// Create a list
router.post('/', authenticateGuest, async (req: AuthRequest, res: Response) => {
  const { boardId, title } = req.body;
  const guestId = req.guestId!;

  try {
    const lastList = await prisma.list.findFirst({
      where: { boardId: parseInt(boardId) },
      orderBy: { position: 'desc' }
    });

    let newPosition = LexoRank.middle().toString();
    if (lastList) {
      newPosition = LexoRank.parse(lastList.position).genNext().toString();
    }

    const list = await prisma.list.create({
      data: {
        title,
        boardId: parseInt(boardId),
        position: newPosition,
        creatorId: guestId
      },
      include: { creator: true }
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// Update list position
router.put('/:id/position', authenticateGuest, async (req: AuthRequest, res: Response): Promise<any> => {
  const { position } = req.body;
  const guestId = req.guestId!;
  
  try {
    const list = await prisma.list.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    if (list.creatorId !== guestId && req.nickname !== 'Administrator01') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own list' });
    }

    const updatedList = await prisma.list.update({
      where: { id: list.id },
      data: { position }
    });
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update list position' });
  }
});

// Update list
router.put('/:id', authenticateGuest, async (req: AuthRequest, res: Response): Promise<any> => {
  const { title } = req.body;
  const guestId = req.guestId!;
  
  try {
    const list = await prisma.list.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    if (list.creatorId !== guestId && req.nickname !== 'Administrator01') {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own list' });
    }

    const updatedList = await prisma.list.update({
      where: { id: list.id },
      data: { title }
    });
    res.json(updatedList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// Delete list
router.delete('/:id', authenticateGuest, async (req: AuthRequest, res: Response): Promise<any> => {
  const guestId = req.guestId!;
  try {
    const list = await prisma.list.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!list) return res.status(404).json({ error: 'List not found' });
    
    if (list.creatorId !== guestId && req.nickname !== 'Administrator01') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own list' });
    }

    await prisma.list.delete({
      where: { id: list.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

export default router;
