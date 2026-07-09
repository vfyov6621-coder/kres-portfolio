'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/* ================================================================== */
/* Snake                                                               */
/* ================================================================== */

const SNAKE_GRID = 15
const SNAKE_SPEED = 150 // ms per tick

type Point = { x: number; y: number }

function randFood(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) }
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p
  }
}

export function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }])
  const [food, setFood] = useState<Point>({ x: 5, y: 5 })
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 })
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const dirRef = useRef(dir)
  useEffect(() => { dirRef.current = dir }, [dir])

  const reset = useCallback(() => {
    setSnake([{ x: 7, y: 7 }])
    setFood({ x: 5, y: 5 })
    setDir({ x: 1, y: 0 })
    setScore(0)
    setOver(false)
    setRunning(true)
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = { x: prev[0].x + dirRef.current.x, y: prev[0].y + dirRef.current.y }
        // wall collision
        if (head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID) {
          setOver(true)
          setRunning(false)
          setBest((b) => Math.max(b, prev.length - 1))
          return prev
        }
        // self collision
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setOver(true)
          setRunning(false)
          setBest((b) => Math.max(b, prev.length - 1))
          return prev
        }
        const next = [head, ...prev]
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => s + 1)
          setFood(randFood(next))
        } else {
          next.pop()
        }
        return next
      })
    }, SNAKE_SPEED)
    return () => clearInterval(id)
  }, [running, food])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      if (k === 'ArrowUp' || k === 'w') setDir((d) => (d.y === 0 ? { x: 0, y: -1 } : d))
      else if (k === 'ArrowDown' || k === 's') setDir((d) => (d.y === 0 ? { x: 0, y: 1 } : d))
      else if (k === 'ArrowLeft' || k === 'a') setDir((d) => (d.x === 0 ? { x: -1, y: 0 } : d))
      else if (k === 'ArrowRight' || k === 'd') setDir((d) => (d.x === 0 ? { x: 1, y: 0 } : d))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-4 text-[12px] font-bold">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>
      <div
        className="relative bg-black"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SNAKE_GRID}, 16px)`,
          gridTemplateRows: `repeat(${SNAKE_GRID}, 16px)`,
          gap: '1px',
        }}
      >
        {Array.from({ length: SNAKE_GRID * SNAKE_GRID }).map((_, i) => {
          const x = i % SNAKE_GRID
          const y = Math.floor(i / SNAKE_GRID)
          const isSnake = snake.some((s) => s.x === x && s.y === y)
          const isHead = snake[0].x === x && snake[0].y === y
          const isFood = food.x === x && food.y === y
          return (
            <div
              key={i}
              style={{
                width: 16,
                height: 16,
                background: isHead ? '#fff' : isSnake ? '#bbb' : isFood ? '#fff' : '#222',
                borderRadius: isFood ? '50%' : 0,
              }}
            />
          )
        })}
        {over && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <span className="text-white text-[14px] font-bold">Game over</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {!running && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1 text-[12px] font-bold bg-white text-black border border-black"
          >
            {over ? 'New game' : 'Start'}
          </button>
        )}
      </div>
      {/* Touch controls for mobile */}
      <div className="md:hidden grid grid-cols-3 gap-1 w-32 mt-1">
        <div />
        <button type="button" onClick={() => setDir((d) => (d.y === 0 ? { x: 0, y: -1 } : d))} className="bg-white text-black py-2 text-[16px]">↑</button>
        <div />
        <button type="button" onClick={() => setDir((d) => (d.x === 0 ? { x: -1, y: 0 } : d))} className="bg-white text-black py-2 text-[16px]">←</button>
        <button type="button" onClick={() => setDir((d) => (d.y === 0 ? { x: 0, y: 1 } : d))} className="bg-white text-black py-2 text-[16px]">↓</button>
        <button type="button" onClick={() => setDir((d) => (d.x === 0 ? { x: 1, y: 0 } : d))} className="bg-white text-black py-2 text-[16px]">→</button>
      </div>
    </div>
  )
}

/* ================================================================== */
/* 2048                                                                */
/* ================================================================== */

const SIZE = 4

type Board = number[][]

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function addRandom(b: Board): Board {
  const cells: [number, number][] = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) cells.push([r, c])
  if (cells.length === 0) return b
  const [r, c] = cells[Math.floor(Math.random() * cells.length)]
  const nb = b.map((row) => [...row])
  nb[r][c] = Math.random() < 0.9 ? 2 : 4
  return nb
}

function slide(row: number[]): { row: number[]; gained: number } {
  const nonZero = row.filter((v) => v !== 0)
  const merged: number[] = []
  let gained = 0
  for (let i = 0; i < nonZero.length; i++) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2
      merged.push(val)
      gained += val
      i++
    } else {
      merged.push(nonZero[i])
    }
  }
  while (merged.length < SIZE) merged.push(0)
  return { row: merged, gained }
}

function rotateCW(b: Board): Board {
  const nb = emptyBoard()
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) nb[c][SIZE - 1 - r] = b[r][c]
  return nb
}

function moveLeft(b: Board): { board: Board; gained: number; moved: boolean } {
  let gained = 0
  const nb = b.map((row) => {
    const { row: r, gained: g } = slide(row)
    gained += g
    return r
  })
  const moved = JSON.stringify(nb) !== JSON.stringify(b)
  return { board: nb, gained, moved }
}

function move(b: Board, dir: 'left' | 'right' | 'up' | 'down'): { board: Board; gained: number; moved: boolean } {
  let rotated = b
  if (dir === 'up') rotated = rotateCW(rotateCW(rotateCW(b)))
  else if (dir === 'right') rotated = rotateCW(rotateCW(b))
  else if (dir === 'down') rotated = rotateCW(b)
  const { board, gained, moved } = moveLeft(rotated)
  let result = board
  if (dir === 'up') result = rotateCW(board)
  else if (dir === 'right') result = rotateCW(rotateCW(board))
  else if (dir === 'down') result = rotateCW(rotateCW(rotateCW(board)))
  return { board: result, gained, moved }
}

const TILE_COLORS: Record<number, string> = {
  0: '#333',
  2: '#eee',
  4: '#ddd',
  8: '#f5a623',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
}

export function Game2048() {
  const [board, setBoard] = useState<Board>(() => addRandom(addRandom(emptyBoard())))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)

  const doMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    setBoard((prev) => {
      const { board: nb, gained, moved } = move(prev, dir)
      if (!moved) return prev
      const withNew = addRandom(nb)
      setScore((s) => {
        const ns = s + gained
        setBest((b) => Math.max(b, ns))
        return ns
      })
      // check game over (no empty cells + no merges possible)
      const hasEmpty = withNew.some((row) => row.some((v) => v === 0))
      if (!hasEmpty) {
        let canMerge = false
        for (let r = 0; r < SIZE && !canMerge; r++)
          for (let c = 0; c < SIZE && !canMerge; c++) {
            if (c + 1 < SIZE && withNew[r][c] === withNew[r][c + 1]) canMerge = true
            if (r + 1 < SIZE && withNew[r][c] === withNew[r + 1][c]) canMerge = true
          }
        if (!canMerge) setOver(true)
      }
      return withNew
    })
  }, [])

  const reset = useCallback(() => {
    setBoard(addRandom(addRandom(emptyBoard())))
    setScore(0)
    setOver(false)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key
      if (k === 'ArrowLeft' || k === 'a') { e.preventDefault(); doMove('left') }
      else if (k === 'ArrowRight' || k === 'd') { e.preventDefault(); doMove('right') }
      else if (k === 'ArrowUp' || k === 'w') { e.preventDefault(); doMove('up') }
      else if (k === 'ArrowDown' || k === 's') { e.preventDefault(); doMove('down') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove])

  // Swipe support for mobile
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) doMove(dx > 0 ? 'right' : 'left')
    } else {
      if (Math.abs(dy) > 30) doMove(dy > 0 ? 'down' : 'up')
    }
    touchStart.current = null
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-4 text-[12px] font-bold">
        <span>Score: {score}</span>
        <span>Best: {best}</span>
      </div>
      <div
        className="relative bg-black p-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 56px)`, gap: '4px' }}
      >
        {board.flat().map((v, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[16px] font-bold"
            style={{
              width: 56,
              height: 56,
              background: TILE_COLORS[v] || '#333',
              color: v <= 4 ? '#000' : '#fff',
              borderRadius: 2,
            }}
          >
            {v !== 0 ? v : ''}
          </div>
        ))}
        {over && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <span className="text-white text-[14px] font-bold">Game over</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="px-3 py-1 text-[12px] font-bold bg-white text-black border border-black"
      >
        New game
      </button>
    </div>
  )
}
