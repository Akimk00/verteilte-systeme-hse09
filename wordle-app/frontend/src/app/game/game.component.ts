import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../game.service';

type LetterState = 'empty' | 'correct' | 'present' | 'absent';

interface Tile {
  letter: string;
  state: LetterState;
}

const ROWS = 6;
const COLS = 5;

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css'
})
export class GameComponent implements OnInit {

  board: Tile[][] = [];
  keyboardRows: string[][] = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
  ];

  private answer = '';
  hint = '';
  showHint = false;

  private currentRow = 0;
  private currentCol = 0;
  gameOver = false;
  message = '';
  shakeRow = -1;
  winRow = -1;

  loading = true;
  error = false;

  private keyboardState: Record<string, LetterState> = {};
  private readonly rank: Record<LetterState, number> = {
    empty: 0,
    absent: 1,
    present: 2,
    correct: 3
  };

  constructor(private gameService: GameService, private router: Router) {}

  ngOnInit(): void {
    this.loadWord();
  }

  loadWord(): void {
    this.resetState();
    this.loading = true;
    this.error = false;
    this.gameService.getWord().subscribe({
      next: (res) => {
        this.answer = res.word.toLowerCase();
        this.hint = res.hint;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  private resetState(): void {
    this.board = this.buildBoard();
    this.currentRow = 0;
    this.currentCol = 0;
    this.gameOver = false;
    this.message = '';
    this.showHint = false;
    this.shakeRow = -1;
    this.winRow = -1;
    this.keyboardState = {};
  }

  private buildBoard(): Tile[][] {
    const board: Tile[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: Tile[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push({ letter: '', state: 'empty' });
      }
      board.push(row);
    }
    return board;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (this.loading || this.error || this.gameOver) {
      return;
    }
    const key = event.key;
    if (key === 'Enter') {
      this.onKey('ENTER');
    } else if (key === 'Backspace') {
      this.onKey('BACK');
    } else if (/^[a-zA-Z]$/.test(key)) {
      this.onKey(key.toUpperCase());
    }
  }

  onKey(key: string): void {
    if (this.gameOver || this.loading || this.error) {
      return;
    }
    if (key === 'ENTER') {
      this.submitGuess();
      return;
    }
    if (key === 'BACK') {
      if (this.currentCol > 0) {
        this.currentCol--;
        this.board[this.currentRow][this.currentCol] = { letter: '', state: 'empty' };
      }
      return;
    }
    if (this.currentCol < COLS) {
      this.board[this.currentRow][this.currentCol] = { letter: key, state: 'empty' };
      this.currentCol++;
    }
  }

  private submitGuess(): void {
    if (this.currentCol < COLS) {
      this.flashMessage('Not enough letters');
      this.triggerShake();
      return;
    }

    const guess = this.board[this.currentRow]
      .map((t) => t.letter)
      .join('')
      .toLowerCase();

    const states = this.evaluate(guess, this.answer);
    for (let i = 0; i < COLS; i++) {
      this.board[this.currentRow][i].state = states[i];
      this.updateKeyboard(guess[i].toUpperCase(), states[i]);
    }

    if (guess === this.answer) {
      this.winRow = this.currentRow;
      this.gameOver = true;
      this.message = 'Solved it.';
    } else if (this.currentRow === ROWS - 1) {
      this.gameOver = true;
      this.message = 'The word was ' + this.answer.toUpperCase();
    } else {
      this.currentRow++;
      this.currentCol = 0;
    }
  }

  // classic scoring with duplicate-letter handling
  private evaluate(guess: string, answer: string): LetterState[] {
    const result: LetterState[] = new Array(COLS).fill('absent');
    const used: boolean[] = new Array(COLS).fill(false);

    for (let i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) {
        result[i] = 'correct';
        used[i] = true;
      }
    }

    for (let i = 0; i < COLS; i++) {
      if (result[i] === 'correct') {
        continue;
      }
      for (let j = 0; j < COLS; j++) {
        if (!used[j] && guess[i] === answer[j]) {
          result[i] = 'present';
          used[j] = true;
          break;
        }
      }
    }
    return result;
  }

  private updateKeyboard(letter: string, state: LetterState): void {
    const current = this.keyboardState[letter] ?? 'empty';
    if (this.rank[state] > this.rank[current]) {
      this.keyboardState[letter] = state;
    }
  }

  keyState(key: string): string {
    if (key === 'ENTER' || key === 'BACK') {
      return '';
    }
    return this.keyboardState[key] ?? '';
  }

  revealHint(): void {
    this.showHint = true;
  }

  newGame(): void {
    this.loadWord();
  }

  private flashMessage(msg: string): void {
    this.message = msg;
    window.setTimeout(() => {
      if (!this.gameOver) {
        this.message = '';
      }
    }, 1400);
  }

  private triggerShake(): void {
    this.shakeRow = this.currentRow;
    window.setTimeout(() => (this.shakeRow = -1), 450);
  }
}
