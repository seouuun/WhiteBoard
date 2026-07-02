import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useBoardStore, calculateNewPosition } from './store/useBoardStore';
import { useAuthStore } from './store/useAuthStore';
import { Plus, GripHorizontal, LogOut, Trash2, Pencil } from 'lucide-react';

function App() {
  const { token, guest, loginAsGuest } = useAuthStore();
  const [nicknameInput, setNicknameInput] = useState('');

  if (!token || !guest) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">WhiteBoard</h1>
          <p className="text-gray-500 mb-8">닉네임을 설정하세요</p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (nicknameInput.trim()) loginAsGuest(nicknameInput);
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              placeholder="사용할 닉네임 입력"
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              required
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              시작하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <BoardScreen />;
}

function BoardScreen() {
  const { board, loading, fetchBoard, moveList, moveCard, addList, addCard, deleteList, deleteCard, editList, editCard } = useBoardStore();
  const { guest, logout } = useAuthStore();
  const [newListTitle, setNewListTitle] = useState('');
  const [newCardTitle, setNewCardTitle] = useState<{ [key: number]: string }>({});
  
  // Editing states
  const [editingList, setEditingList] = useState<{ id: number, title: string } | null>(null);
  const [editingCard, setEditingCard] = useState<{ id: number, title: string } | null>(null);

  useEffect(() => {
    fetchBoard(1);
  }, [fetchBoard]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'list') {
      const listId = parseInt(draggableId.split('-')[1]);
      const list = board?.lists.find(l => l.id === listId);
      if (list?.creatorId !== guest?.id && guest?.nickname !== 'Administrator01') {
        alert('자신이 생성한 리스트만 이동할 수 있습니다.');
        return;
      }
      const newPos = calculateNewPosition(board!.lists, destination.index);
      moveList(listId, newPos);
    } else if (type === 'card') {
      const cardId = parseInt(draggableId.split('-')[1]);
      const sourceListId = parseInt(source.droppableId.split('-')[1]);
      const destListId = parseInt(destination.droppableId.split('-')[1]);
      
      const sourceList = board!.lists.find(l => l.id === sourceListId);
      const card = sourceList?.cards.find(c => c.id === cardId);
      if (card?.creatorId !== guest?.id && guest?.nickname !== 'Administrator01') {
        alert('자신이 생성한 카드만 이동할 수 있습니다.');
        return;
      }

      const destList = board!.lists.find(l => l.id === destListId);
      if (!destList) return;

      const destCards = destList.cards.filter(c => c.id !== cardId);
      const newPos = calculateNewPosition(destCards, destination.index);
      
      moveCard(cardId, sourceListId, destListId, newPos);
    }
  };

  const handleAddList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !board) return;
    addList(board.id, newListTitle);
    setNewListTitle('');
  };

  const handleAddCard = (listId: number) => {
    const title = newCardTitle[listId];
    if (!title?.trim()) return;
    addCard(listId, title);
    setNewCardTitle({ ...newCardTitle, [listId]: '' });
  };

  if (loading && !board) return <div className="h-screen flex items-center justify-center">로딩 중...</div>;
  if (!board) return <div className="h-screen flex items-center justify-center">보드를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-blue-600 text-white flex flex-col font-sans">
      <header className="p-4 bg-blue-700 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-xl">{board.title || 'WhiteBoard'}</h1>
        <div className="flex items-center gap-4">
          <span className="text-blue-100 text-sm">
            접속 중: <strong>{guest?.nickname}</strong>
          </span>
          <button 
            onClick={logout}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded transition-colors"
          >
            <LogOut size={16} /> 닉네임 변경
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-x-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="list" direction="horizontal">
            {(provided) => (
              <div 
                className="flex gap-4 h-full items-start"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {board.lists.map((list, index) => {
                  const isMyList = list.creatorId === guest?.id || guest?.nickname === 'Administrator01';
                  const isEditingList = editingList?.id === list.id;

                  return (
                    <Draggable key={`list-${list.id}`} draggableId={`list-${list.id}`} index={index} isDragDisabled={!isMyList}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="bg-gray-100 rounded-xl shadow-sm w-72 flex-shrink-0 text-gray-800 flex flex-col max-h-full"
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className={`p-3 font-semibold flex justify-between items-center rounded-t-xl group ${isMyList ? 'bg-gray-200 cursor-grab' : 'bg-gray-100 cursor-default'}`}
                          >
                            <div className="flex items-center gap-2 flex-1 mr-2">
                              {isMyList && <GripHorizontal size={16} className="text-gray-400 shrink-0" />}
                              
                              {isEditingList ? (
                                <input 
                                  autoFocus
                                  className="px-2 py-1 border rounded w-full font-semibold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editingList.title}
                                  onChange={e => setEditingList({ ...editingList, title: e.target.value })}
                                  onBlur={() => {
                                    if (editingList.title.trim() && editingList.title !== list.title) {
                                      editList(list.id, editingList.title);
                                    }
                                    setEditingList(null);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                      if (editingList.title.trim() && editingList.title !== list.title) {
                                        editList(list.id, editingList.title);
                                      }
                                      setEditingList(null);
                                    }
                                  }}
                                />
                              ) : (
                                <h3 className="truncate" title={list.title}>{list.title}</h3>
                              )}
                            </div>

                            {isMyList && !isEditingList && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setEditingList({ id: list.id, title: list.title })}
                                  className="text-gray-400 hover:text-blue-500"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => { if(confirm('정말 이 리스트를 삭제할까요?')) deleteList(list.id); }}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <Droppable droppableId={`list-${list.id}`} type="card">
                            {(provided) => (
                              <div 
                                className="p-2 flex-1 overflow-y-auto min-h-[50px] flex flex-col gap-2"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                {list.cards.map((card, index) => {
                                  const isMyCard = card.creatorId === guest?.id || guest?.nickname === 'Administrator01';
                                  const isEditingCard = editingCard?.id === card.id;

                                  return (
                                    <Draggable key={`card-${card.id}`} draggableId={`card-${card.id}`} index={index} isDragDisabled={!isMyCard}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`bg-white p-3 rounded shadow-sm border border-gray-200 text-sm group ${isMyCard ? 'cursor-grab hover:bg-gray-50' : 'cursor-default'} ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-md' : ''}`}
                                        >
                                          {isEditingCard ? (
                                            <div className="flex flex-col gap-2">
                                              <input
                                                autoFocus
                                                className="w-full border p-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                value={editingCard.title}
                                                onChange={e => setEditingCard({ ...editingCard, title: e.target.value })}
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                    if (editingCard.title.trim() && editingCard.title !== card.title) {
                                                      editCard(card.id, editingCard.title);
                                                    }
                                                    setEditingCard(null);
                                                  }
                                                }}
                                              />
                                              <div className="flex gap-2 justify-end">
                                                <button 
                                                  className="text-xs text-gray-500 hover:text-gray-800"
                                                  onClick={() => setEditingCard(null)}
                                                >취소</button>
                                                <button 
                                                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                                  onClick={() => {
                                                    if (editingCard.title.trim() && editingCard.title !== card.title) {
                                                      editCard(card.id, editingCard.title);
                                                    }
                                                    setEditingCard(null);
                                                  }}
                                                >저장</button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex justify-between items-start gap-2">
                                              <p className="break-words flex-1 leading-tight">{card.title}</p>
                                              {isMyCard && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button 
                                                    onClick={(e) => { e.preventDefault(); setEditingCard({ id: card.id, title: card.title }); }}
                                                    className="text-gray-300 hover:text-blue-500"
                                                  >
                                                    <Pencil size={14} />
                                                  </button>
                                                  <button 
                                                    onClick={(e) => { e.preventDefault(); if(confirm('이 카드를 삭제할까요?')) deleteCard(card.id); }}
                                                    className="text-gray-300 hover:text-red-500"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          <div className="p-2 border-t border-gray-200">
                            <input
                              type="text"
                              placeholder="카드 추가..."
                              className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={newCardTitle[list.id] || ''}
                              onChange={(e) => setNewCardTitle({ ...newCardTitle, [list.id]: e.target.value })}
                              onKeyDown={(e) => { if(e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddCard(list.id); }}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                
                <form onSubmit={handleAddList} className="w-72 flex-shrink-0">
                  <div className="bg-blue-500/50 hover:bg-blue-500/70 transition-colors p-3 rounded-xl flex items-center gap-2 cursor-pointer text-white text-sm font-semibold">
                    <Plus size={20} />
                    <input 
                      type="text"
                      className="bg-transparent outline-none placeholder-white/80 w-full"
                      placeholder="새 리스트 추가"
                      value={newListTitle}
                      onChange={e => setNewListTitle(e.target.value)}
                    />
                  </div>
                </form>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>
    </div>
  );
}

export default App;
