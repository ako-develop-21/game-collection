import { ref, computed } from 'vue'

export type SudokuDifficulty = 'easy' | 'medium' | 'hard'

export interface SudokuCell {
  value: number | null
  original: boolean
  notes: number[]
  error: boolean
}

export function useSudoku() {
  const grid = ref<SudokuCell[][]>([])
  const solution = ref<number[][]>([])
  const difficulty = ref<SudokuDifficulty>('medium')
  const selectedCell = ref<{ row: number; col: number } | null>(null)
  const isNoteMode = ref(false)
  const gameWon = ref(false)
  const timer = ref(0)
  const timerInterval = ref<number | null>(null)

  const formattedTime = computed(() => {
    const mins = Math.floor(timer.value / 60)
    const secs = timer.value % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const initGame = (diff: SudokuDifficulty = 'medium') => {
    difficulty.value = diff
    generateBoard()
    startTimer()
    gameWon.value = false
    selectedCell.value = null
  }

  const startTimer = () => {
    if (timerInterval.value) clearInterval(timerInterval.value)
    timer.value = 0
    timerInterval.value = window.setInterval(() => {
      timer.value++
    }, 1000)
  }

  const generateBoard = () => {
    // 1. Generate full valid board
    const fullBoard = Array.from({ length: 9 }, () => Array(9).fill(0))
    fillBoard(fullBoard)
    solution.value = fullBoard.map(row => [...row])

    // 2. Remove numbers based on difficulty
    const cellsToRemoveCount = {
      easy: 30,
      medium: 45,
      hard: 55
    }[difficulty.value] || 45

    const playableBoard = fullBoard.map(row => [...row])
    let removed = 0
    while (removed < cellsToRemoveCount) {
      const row = Math.floor(Math.random() * 9)
      const col = Math.floor(Math.random() * 9)
      const rowData = playableBoard[row]
      if (rowData && rowData[col] !== 0) {
        rowData[col] = 0
        removed++
      }
    }

    // 3. Convert to SudokuCell objects
    grid.value = playableBoard.map((row) =>
      row.map((val) => ({
        value: val === 0 ? null : val,
        original: val !== 0,
        notes: [],
        error: false
      }))
    )

    checkErrors()
  }

  const fillBoard = (board: number[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const rowData = board[row]
        if (rowData && rowData[col] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
          for (const num of nums) {
            if (isValid(board, row, col, num)) {
              rowData[col] = num
              if (fillBoard(board)) return true
              rowData[col] = 0
            }
          }
          return false
        }
      }
    }
    return true
  }

  const isValid = (board: number[][], row: number, col: number, num: number): boolean => {
    for (let i = 0; i < 9; i++) {
      if (board[row]?.[i] === num) return false
      if (board[i]?.[col] === num) return false
      const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3)
      const boxCol = 3 * Math.floor(col / 3) + (i % 3)
      if (board[boxRow]?.[boxCol] === num) return false
    }
    return true
  }

  const setCellValue = (row: number, col: number, value: number | null) => {
    const cell = grid.value[row]?.[col]
    if (!cell || cell.original || gameWon.value) return

    if (isNoteMode.value) {
      if (value === null) {
        cell.notes = []
      } else {
        const index = cell.notes.indexOf(value)
        if (index > -1) {
          cell.notes.splice(index, 1)
        } else {
          cell.notes.push(value)
          cell.notes.sort((a, b) => a - b)
        }
      }
    } else {
      cell.value = value
      cell.notes = []
      checkErrors()
      checkWin()
    }
  }

  const numberCounts = computed(() => {
    const counts: Record<number, number> = {}
    for (let i = 1; i <= 9; i++) counts[i] = 0

    grid.value.forEach(row => {
      row.forEach(cell => {
        if (cell.value !== null && !cell.error) {
          const val = cell.value
          counts[val] = (counts[val] || 0) + 1
        }
      })
    })

    return counts
  })

  const checkErrors = () => {
    const boardValues = grid.value.map(r => r.map(cell => cell.value || 0))
    
    for (let r = 0; r < 9; r++) {
      const row = grid.value[r]
      if (!row) continue
      for (let c = 0; c < 9; c++) {
        const cell = row[c]
        if (!cell) continue
        if (cell.value === null) {
          cell.error = false
          continue
        }
        
        // Use a snapshot of values but clear the current spot for validation
        const val = cell.value
        const rowValues = boardValues[r]
        if (!rowValues) continue
        
        const originalVal = rowValues[c]
        if (originalVal === undefined) continue
        
        rowValues[c] = 0
        cell.error = !isValid(boardValues, r, c, val)
        rowValues[c] = originalVal // Restore
      }
    }
  }

  const checkWin = () => {
    const isFull = grid.value.every(row => row.every(cell => cell.value !== null && !cell.error))
    if (isFull) {
      gameWon.value = true
      if (timerInterval.value) clearInterval(timerInterval.value)
    }
  }

  return {
    grid,
    difficulty,
    selectedCell,
    isNoteMode,
    gameWon,
    formattedTime,
    initGame,
    setCellValue,
    numberCounts
  }
}
