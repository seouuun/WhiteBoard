import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all boards
router.get('/', async (req, res) => {
  try {
    const boards = await prisma.board.findMany();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// Create a board
router.post('/', async (req, res) => {
  const { title } = req.body;
  try {
    const board = await prisma.board.create({
      data: { title }
    });
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Get a specific board with lists and cards
router.get('/:id', async (req, res) => {
  try {
    const board = await prisma.board.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        lists: {
          include: { 
            cards: { include: { creator: true } },
            creator: true
          },
          orderBy: { position: 'asc' }
        }
      }
    });
    
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Sort cards by position
    board.lists.forEach(list => {
      list.cards.sort((a, b) => a.position.localeCompare(b.position));
    });
    
    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

export default router;
