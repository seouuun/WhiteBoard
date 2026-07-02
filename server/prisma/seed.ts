import { PrismaClient } from '@prisma/client';
import { LexoRank } from 'lexorank';

const prisma = new PrismaClient();

async function main() {
  const guest = await prisma.guest.create({
    data: {
      nickname: 'GuestAdmin'
    }
  });

  const board = await prisma.board.create({
    data: {
      title: 'WhiteBoard',
    }
  });

  const list1Pos = LexoRank.middle().toString();
  const list1 = await prisma.list.create({
    data: {
      title: '할 일',
      boardId: board.id,
      position: list1Pos,
      creatorId: guest.id
    }
  });

  const list2Pos = LexoRank.parse(list1Pos).genNext().toString();
  const list2 = await prisma.list.create({
    data: {
      title: '진행 중',
      boardId: board.id,
      position: list2Pos,
      creatorId: guest.id
    }
  });

  const card1Pos = LexoRank.middle().toString();
  await prisma.card.create({
    data: {
      title: '프로젝트 초기화',
      content: '저장소 생성 및 세팅',
      listId: list1.id,
      position: card1Pos,
      creatorId: guest.id
    }
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
