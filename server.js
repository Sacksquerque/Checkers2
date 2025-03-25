// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
 

app.use(express.static(path.join(__dirname, 'public')));


class Checkers {
  constructor() {
    this.board = this.createBoard();
    this.currentPlayer = 'R';
  }

  createBoard() {
    const board = [];
    for (let row = 0; row < 8; row++) {
      board[row] = [];
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          if (row < 3) board[row][col] = 'B';
          else if (row > 4) board[row][col] = 'R';
          else board[row][col] = null;
        } else {
          board[row][col] = null;
        }
      }
    }
    return board;
  }

  movePiece(fromRow, fromCol, toRow, toCol) {
    if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
      if (Math.abs(toRow - fromRow) === 2) {
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        this.board[midRow][midCol] = null;
      }
      this.board[toRow][toCol] = this.board[fromRow][fromCol];
      this.board[fromRow][fromCol] = null;
      if ((this.board[toRow][toCol] === 'R' && toRow === 0) ||
          (this.board[toRow][toCol] === 'B' && toRow === 7)) {
        this.board[toRow][toCol] = this.board[toRow][toCol] + 'K';
      }
      this.switchPlayer();
      return true;
    }
    return false;
  }

  isValidMove(fromRow, fromCol, toRow, toCol) {
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) return false;
    if (this.board[toRow][toCol] !== null) return false;

    const piece = this.board[fromRow][fromCol];
    if (!piece) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
    if (piece.includes('K')) {
      if (absRowDiff === 1 && absColDiff === 1) return true;
      if (absRowDiff === 2 && absColDiff === 2) {
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        return this.board[midRow][midCol] && this.board[midRow][midCol][0] !== piece[0];
      }
    } else {
      if ((piece === 'R' && rowDiff !== -1) && (piece === 'B' && rowDiff !== 1)) return false;
      if (absRowDiff === 1 && absColDiff === 1) return true;
      if (absRowDiff === 2 && absColDiff === 2) {
        const midRow = (fromRow + toRow) / 2;
        const midCol = (fromCol + toCol) / 2;
        return this.board[midRow][midCol] && this.board[midRow][midCol][0] !== piece[0];
      }
    }
    return false;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 'R' ? 'B' : 'R';
  }
}

const game = new Checkers();
io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);
  socket.emit('gameState', { board: game.board, currentPlayer: game.currentPlayer });
  socket.on('move', (data) => {
    const { fromRow, fromCol, toRow, toCol } = data;
    const moveSuccessful = game.movePiece(fromRow, fromCol, toRow, toCol);
    if (moveSuccessful) {
      io.emit('gameState', { board: game.board, currentPlayer: game.currentPlayer });
    } else {
      socket.emit('invalidMove', { message: 'Invalid move' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
