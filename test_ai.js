// AI算法测试脚本
const tetrisAI = require('./server/utils/ai/tetrisAI');

// 测试AI算法
function testAI() {
  console.log('开始测试AI算法...');
  
  // 创建一个测试棋盘
  const testBoard = Array(20).fill().map(() => Array(10).fill(0));
  
  // 在棋盘底部添加一些方块
  for (let i = 0; i < 10; i++) {
    testBoard[19][i] = 1;
  }
  for (let i = 0; i < 8; i++) {
    testBoard[18][i] = 1;
  }
  
  console.log('测试棋盘:');
  printBoard(testBoard);
  
  // 测试I型方块
  console.log('\n测试I型方块:');
  const iPiece = [[1, 1, 1, 1]];
  const bestMoveI = tetrisAI.findBestMove(testBoard, iPiece);
  console.log('最佳移动:', bestMoveI);
  
  // 测试T型方块
  console.log('\n测试T型方块:');
  const tPiece = [
    [0, 1, 0],
    [1, 1, 1]
  ];
  const bestMoveT = tetrisAI.findBestMove(testBoard, tPiece);
  console.log('最佳移动:', bestMoveT);
  
  // 测试L型方块
  console.log('\n测试L型方块:');
  const lPiece = [
    [1, 0],
    [1, 0],
    [1, 1]
  ];
  const bestMoveL = tetrisAI.findBestMove(testBoard, lPiece);
  console.log('最佳移动:', bestMoveL);
  
  // 测试AI操作生成
  console.log('\n测试AI操作生成:');
  if (bestMoveI) {
    const actions = tetrisAI.generateActions(bestMoveI, 0, 0);
    console.log('I型方块操作序列:', actions);
  }
  
  console.log('\nAI算法测试完成!');
}

// 打印棋盘
function printBoard(board) {
  for (let i = 0; i < board.length; i++) {
    let row = '';
    for (let j = 0; j < board[i].length; j++) {
      row += board[i][j] ? 'X' : '.';
    }
    console.log(row);
  }
}

// 运行测试
testAI();