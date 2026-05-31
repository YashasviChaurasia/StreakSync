"use client";

import { useRef, useEffect } from "react";

interface GameOfLifeProps {
  className?: string;
  seed?: string;
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

// Call this from outside to inject a random live cell
let pendingInjections = 0;

export function injectCell() {
  pendingInjections++;
}

export function GameOfLife({ className, seed = "default" }: GameOfLifeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

    const CELL = 5;
    const cols = Math.floor(canvas.width / CELL);
    const rows = Math.floor(canvas.height / CELL);
    const rng = seededRandom(seed);

    // Initialize grid
    let grid = new Uint8Array(cols * rows);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = rng() < 0.2 ? 1 : 0;
    }

    const ctx = canvas.getContext("2d")!;
    let frameCount = 0;

    const step = () => {
      // Inject cells from streak completions
      while (pendingInjections > 0) {
        pendingInjections--;
        // Place a small random pattern (glider-like) at a random position
        const cx = Math.floor(Math.random() * (cols - 4)) + 2;
        const cy = Math.floor(Math.random() * (rows - 4)) + 2;
        // Random pattern from a few known active ones
        const patterns = [
          [[0,1],[1,2],[2,0],[2,1],[2,2]], // glider
          [[0,0],[0,1],[0,2],[1,0],[2,1]], // r-pentomino
          [[0,0],[1,0],[2,0],[2,1],[1,2]], // another active shape
        ];
        const pat = patterns[Math.floor(Math.random() * patterns.length)];
        for (const [dy, dx] of pat) {
          const idx = ((cy + dy) % rows) * cols + ((cx + dx) % cols);
          grid[idx] = 1;
        }
      }

      const next = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx === 0) continue;
              const ny = (y + dy + rows) % rows;
              const nx = (x + dx + cols) % cols;
              n += grid[ny * cols + nx];
            }
          }
          const idx = y * cols + x;
          if (grid[idx]) {
            next[idx] = (n === 2 || n === 3) ? 1 : 0;
          } else {
            next[idx] = n === 3 ? 1 : 0;
          }
        }
      }
      grid = next;
    };

    const draw = () => {
      frameCount++;
      if (frameCount % 4 === 0) step();

      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#2a2825";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y * cols + x]) {
            ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(() => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    });
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
