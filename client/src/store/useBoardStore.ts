import { create } from 'zustand';
import axios from 'axios';
import { LexoRank } from 'lexorank';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Card {
  id: number;
  listId: number;
  title: string;
  content: string | null;
  position: string;
  creatorId: string;
}

export interface List {
  id: number;
  boardId: number;
  title: string;
  position: string;
  creatorId: string;
  cards: Card[];
}

export interface Board {
  id: number;
  title: string;
  ownerId: number;
  lists: List[];
}

interface BoardState {
  board: Board | null;
  loading: boolean;
  fetchBoard: (id: number) => Promise<void>;
  moveList: (listId: number, newPosition: string) => Promise<void>;
  moveCard: (cardId: number, sourceListId: number, destListId: number, newPosition: string) => Promise<void>;
  addList: (boardId: number, title: string) => Promise<void>;
  addCard: (listId: number, title: string, content?: string) => Promise<void>;
  deleteList: (listId: number) => Promise<void>;
  deleteCard: (cardId: number) => Promise<void>;
  editList: (listId: number, title: string) => Promise<void>;
  editCard: (cardId: number, title: string, content?: string) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  loading: false,

  fetchBoard: async (id: number) => {
    set({ loading: true });
    try {
      const res = await axios.get(`${API_URL}/boards/${id}`);
      set({ board: res.data, loading: false });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  moveList: async (listId, newPosition) => {
    const { board } = get();
    if (!board) return;

    // Optimistic UI update
    const updatedLists = board.lists.map(list => 
      list.id === listId ? { ...list, position: newPosition } : list
    ).sort((a, b) => a.position.localeCompare(b.position));

    set({ board: { ...board, lists: updatedLists } });

    try {
      await axios.put(`${API_URL}/lists/${listId}/position`, { position: newPosition });
    } catch (error) {
      console.error('Failed to update list position on server', error);
      // Revert could be implemented here by re-fetching the board
      get().fetchBoard(board.id);
    }
  },

  moveCard: async (cardId, sourceListId, destListId, newPosition) => {
    const { board } = get();
    if (!board) return;

    const sourceList = board.lists.find(l => l.id === sourceListId);
    const destList = board.lists.find(l => l.id === destListId);
    
    if (!sourceList || !destList) return;

    const card = sourceList.cards.find(c => c.id === cardId);
    if (!card) return;

    // Optimistic UI update
    const updatedCard = { ...card, position: newPosition, listId: destListId };
    
    const updatedLists = board.lists.map(list => {
      if (list.id === sourceListId && sourceListId !== destListId) {
        return { ...list, cards: list.cards.filter(c => c.id !== cardId) };
      }
      if (list.id === destListId) {
        const cards = sourceListId === destListId 
          ? list.cards.map(c => c.id === cardId ? updatedCard : c)
          : [...list.cards, updatedCard];
        return { ...list, cards: cards.sort((a, b) => a.position.localeCompare(b.position)) };
      }
      return list;
    });

    set({ board: { ...board, lists: updatedLists } });

    try {
      await axios.put(`${API_URL}/cards/${cardId}/position`, { 
        position: newPosition,
        listId: destListId
      });
    } catch (error) {
      console.error('Failed to update card position on server', error);
      get().fetchBoard(board.id);
    }
  },

  addList: async (boardId, title) => {
    const { board } = get();
    if (!board) return;
    
    const position = board.lists.length > 0 
      ? LexoRank.parse(board.lists[board.lists.length - 1].position).genNext().toString() 
      : LexoRank.middle().toString();
      
    const optimisticList: List = {
      id: -Date.now(),
      boardId,
      title,
      position,
      creatorId: 'temp',
      cards: []
    };
    
    set({ board: { ...board, lists: [...board.lists, optimisticList] } });

    try {
      await axios.post(`${API_URL}/lists`, { boardId, title });
      get().fetchBoard(boardId);
    } catch (error) {
      console.error(error);
      get().fetchBoard(boardId);
    }
  },

  addCard: async (listId, title, content = '') => {
    const { board } = get();
    if (!board) return;
    
    const list = board.lists.find(l => l.id === listId);
    if (!list) return;

    const position = list.cards.length > 0 
      ? LexoRank.parse(list.cards[list.cards.length - 1].position).genNext().toString() 
      : LexoRank.middle().toString();

    const optimisticCard: Card = {
      id: -Date.now(),
      listId,
      title,
      content,
      position,
      creatorId: 'temp',
    };

    const updatedLists = board.lists.map(l => 
      l.id === listId ? { ...l, cards: [...l.cards, optimisticCard] } : l
    );

    set({ board: { ...board, lists: updatedLists } });

    try {
      await axios.post(`${API_URL}/cards`, { listId, title, content });
      get().fetchBoard(board.id);
    } catch (error) {
      console.error(error);
      get().fetchBoard(board.id);
    }
  },

  deleteList: async (listId) => {
    const { board } = get();
    if (!board) return;
    
    set({ board: { ...board, lists: board.lists.filter(l => l.id !== listId) } });

    try {
      await axios.delete(`${API_URL}/lists/${listId}`);
    } catch (error) {
      console.error(error);
      alert('권한이 없거나 삭제에 실패했습니다.');
      get().fetchBoard(board.id);
    }
  },

  deleteCard: async (cardId) => {
    const { board } = get();
    if (!board) return;

    const updatedLists = board.lists.map(l => ({
      ...l,
      cards: l.cards.filter(c => c.id !== cardId)
    }));

    set({ board: { ...board, lists: updatedLists } });

    try {
      await axios.delete(`${API_URL}/cards/${cardId}`);
    } catch (error) {
      console.error(error);
      alert('권한이 없거나 삭제에 실패했습니다.');
      get().fetchBoard(board.id);
    }
  },

  editList: async (listId, title) => {
    const { board } = get();
    if (!board) return;

    const updatedLists = board.lists.map(l => 
      l.id === listId ? { ...l, title } : l
    );

    set({ board: { ...board, lists: updatedLists } });

    try {
      await axios.put(`${API_URL}/lists/${listId}`, { title });
    } catch (error) {
      console.error(error);
      alert('권한이 없거나 수정에 실패했습니다.');
      get().fetchBoard(board.id);
    }
  },

  editCard: async (cardId, title, content = '') => {
    const { board } = get();
    if (!board) return;

    const updatedLists = board.lists.map(l => ({
      ...l,
      cards: l.cards.map(c => c.id === cardId ? { ...c, title, content } : c)
    }));

    set({ board: { ...board, lists: updatedLists } });

    try {
      await axios.put(`${API_URL}/cards/${cardId}`, { title, content });
    } catch (error) {
      console.error(error);
      alert('권한이 없거나 수정에 실패했습니다.');
      get().fetchBoard(board.id);
    }
  }
}));

// Utility to calculate LexoRank for DnD between items
export const calculateNewPosition = (items: { position: string }[], destinationIndex: number) => {
  if (items.length === 0) {
    return LexoRank.middle().toString();
  }

  if (destinationIndex === 0) {
    return LexoRank.parse(items[0].position).genPrev().toString();
  }

  if (destinationIndex >= items.length) {
    return LexoRank.parse(items[items.length - 1].position).genNext().toString();
  }

  const prev = LexoRank.parse(items[destinationIndex - 1].position);
  const next = LexoRank.parse(items[destinationIndex].position);
  return prev.between(next).toString();
};
