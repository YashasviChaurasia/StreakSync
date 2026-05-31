"use client";

import { useRef, useEffect, useCallback } from "react";

interface EcosystemProps {
  className?: string;
  seed?: string;
}

// Seeded PRNG
function createRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

const enum Species {
  Plant = 0,
  Herbivore = 1,
  Predator = 2,
  Scavenger = 3,
  Spore = 4,
  Parasite = 5,
}

interface Organism {
  x: number;
  y: number;
  vx: number;
  vy: number;
  species: Species;
  energy: number;
  age: number;
  maxAge: number;
  reproThreshold: number;
  mutationRate: number;
  speed: number;
  size: number;
  cooldown: number;
}

const SPECIES_COLORS: Record<Species, { r: number; g: number; b: number }> = {
  [Species.Plant]: { r: 40, g: 200, b: 80 },
  [Species.Herbivore]: { r: 60, g: 180, b: 255 },
  [Species.Predator]: { r: 255, g: 60, b: 80 },
  [Species.Scavenger]: { r: 200, g: 150, b: 50 },
  [Species.Spore]: { r: 180, g: 100, b: 255 },
  [Species.Parasite]: { r: 255, g: 120, b: 200 },
};

const SPECIES_GLOW: Record<Species, number> = {
  [Species.Plant]: 4,
  [Species.Herbivore]: 6,
  [Species.Predator]: 10,
  [Species.Scavenger]: 5,
  [Species.Spore]: 8,
  [Species.Parasite]: 7,
};

// External injection queue — call this to add organisms from outside
let injectionQueue: Species[] = [];

export function injectOrganism(species?: Species) {
  const s = species ?? ([Species.Plant, Species.Herbivore, Species.Plant, Species.Herbivore, Species.Scavenger][Math.floor(Math.random() * 5)]);
  injectionQueue.push(s);
}

export function injectPredator() {
  injectionQueue.push(Species.Predator);
}

export function injectSpore() {
  injectionQueue.push(Species.Spore);
}

export function triggerDisturbance() {
  // Push a special marker
  injectionQueue.push(-1 as Species);
}

export function Ecosystem({ className, seed = "ecosystem" }: EcosystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const organismsRef = useRef<Organism[]>([]);
  const nutrientsRef = useRef<Float32Array>(new Float32Array(0));
  const animRef = useRef<number>(0);
  const worldRef = useRef({ w: 0, h: 0 });
  const tickRef = useRef(0);

  const GRID_SIZE = 4;

  const spawn = useCallback((rng: () => number, w: number, h: number, species: Species, x?: number, y?: number): Organism => {
    const speeds = [0, 0.8, 1.5, 0.6, 0.3, 1.2];
    const sizes = [2.5, 3, 4, 3, 2, 2.5];
    const maxAges = [400, 600, 500, 700, 200, 350];
    const reproThresholds = [30, 60, 80, 50, 20, 40];

    return {
      x: x ?? rng() * w,
      y: y ?? rng() * h,
      vx: (rng() - 0.5) * speeds[species],
      vy: (rng() - 0.5) * speeds[species],
      species,
      energy: 30 + rng() * 30,
      age: 0,
      maxAge: maxAges[species] + (rng() - 0.5) * 100,
      reproThreshold: reproThresholds[species],
      mutationRate: 0.05 + rng() * 0.1,
      speed: speeds[species] * (0.8 + rng() * 0.4),
      size: sizes[species] * (0.8 + rng() * 0.4),
      cooldown: 0,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      worldRef.current = { w: canvas.width, h: canvas.height };

      const gw = Math.ceil(canvas.width / GRID_SIZE);
      const gh = Math.ceil(canvas.height / GRID_SIZE);
      if (nutrientsRef.current.length !== gw * gh) {
        nutrientsRef.current = new Float32Array(gw * gh);
        for (let i = 0; i < nutrientsRef.current.length; i++) {
          nutrientsRef.current[i] = 0.3 + Math.random() * 0.2;
        }
      }
    };

    resize();
    const rng = createRng(seed);
    const { w, h } = worldRef.current;

    // Initial population
    const orgs: Organism[] = [];
    for (let i = 0; i < 80; i++) orgs.push(spawn(rng, w, h, Species.Plant));
    for (let i = 0; i < 30; i++) orgs.push(spawn(rng, w, h, Species.Herbivore));
    for (let i = 0; i < 12; i++) orgs.push(spawn(rng, w, h, Species.Predator));
    for (let i = 0; i < 8; i++) orgs.push(spawn(rng, w, h, Species.Scavenger));
    for (let i = 0; i < 5; i++) orgs.push(spawn(rng, w, h, Species.Spore));
    for (let i = 0; i < 4; i++) orgs.push(spawn(rng, w, h, Species.Parasite));
    organismsRef.current = orgs;

    const ctx = canvas.getContext("2d")!;

    const dist2 = (a: Organism, b: Organism) => {
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const { w, h } = worldRef.current;
      if (dx > w / 2) dx -= w; if (dx < -w / 2) dx += w;
      if (dy > h / 2) dy -= h; if (dy < -h / 2) dy += h;
      return dx * dx + dy * dy;
    };

    const toward = (from: Organism, to: Organism, strength: number) => {
      let dx = to.x - from.x;
      let dy = to.y - from.y;
      const { w, h } = worldRef.current;
      if (dx > w / 2) dx -= w; if (dx < -w / 2) dx += w;
      if (dy > h / 2) dy -= h; if (dy < -h / 2) dy += h;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      from.vx += (dx / d) * strength;
      from.vy += (dy / d) * strength;
    };

    const simulate = () => {
      tickRef.current++;
      const { w, h } = worldRef.current;
      const gw = Math.ceil(w / GRID_SIZE);
      const orgs = organismsRef.current;
      const nutrients = nutrientsRef.current;

      // Nutrient regeneration
      if (tickRef.current % 3 === 0) {
        for (let i = 0; i < nutrients.length; i++) {
          nutrients[i] = Math.min(1, nutrients[i] + 0.002);
        }
      }

      // Process injection queue
      while (injectionQueue.length > 0) {
        const s = injectionQueue.shift()!;
        if (s === -1 as unknown) {
          // Disturbance
          const cx = Math.random() * w;
          const cy = Math.random() * h;
          for (let i = 0; i < nutrients.length; i++) {
            const gx = (i % gw) * GRID_SIZE;
            const gy = Math.floor(i / gw) * GRID_SIZE;
            if (Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2) < 60) nutrients[i] = 0;
          }
        } else if (orgs.length < 600) {
          orgs.push(spawn(Math.random, w, h, s));
        }
      }

      // Environmental disturbance every ~2000 ticks
      if (tickRef.current % 2000 === 0) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        for (let i = 0; i < nutrients.length; i++) {
          const gx = (i % gw) * GRID_SIZE;
          const gy = Math.floor(i / gw) * GRID_SIZE;
          const d = Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2);
          if (d < 80) nutrients[i] = 0;
        }
      }

      const newOrgs: Organism[] = [];

      for (let i = orgs.length - 1; i >= 0; i--) {
        const o = orgs[i];
        o.age++;
        o.cooldown = Math.max(0, o.cooldown - 1);

        // Energy drain
        o.energy -= o.species === Species.Plant ? 0.05 : 0.15;

        // Plant photosynthesis from nutrients
        if (o.species === Species.Plant) {
          const gi = Math.floor(o.x / GRID_SIZE) + Math.floor(o.y / GRID_SIZE) * gw;
          if (gi >= 0 && gi < nutrients.length && nutrients[gi] > 0.1) {
            o.energy += 0.4;
            nutrients[gi] -= 0.01;
          }
          // Slight drift
          o.x += (Math.random() - 0.5) * 0.2;
          o.y += (Math.random() - 0.5) * 0.2;
        }

        // Herbivore: seek plants
        if (o.species === Species.Herbivore) {
          let closest: Organism | null = null;
          let closestD = 60 * 60;
          for (const t of orgs) {
            if (t.species !== Species.Plant) continue;
            const d = dist2(o, t);
            if (d < closestD) { closest = t; closestD = d; }
          }
          if (closest) toward(o, closest, 0.15);
          if (closest && closestD < 10 * 10) {
            o.energy += 15;
            closest.energy = -1; // kill plant
          }
          // Flee predators
          for (const t of orgs) {
            if (t.species !== Species.Predator) continue;
            if (dist2(o, t) < 40 * 40) toward(o, t, -0.2);
          }
        }

        // Predator: hunt herbivores
        if (o.species === Species.Predator) {
          let closest: Organism | null = null;
          let closestD = 80 * 80;
          for (const t of orgs) {
            if (t.species !== Species.Herbivore && t.species !== Species.Scavenger) continue;
            const d = dist2(o, t);
            if (d < closestD) { closest = t; closestD = d; }
          }
          if (closest) toward(o, closest, 0.2);
          if (closest && closestD < 12 * 12) {
            o.energy += 25;
            closest.energy = -1;
          }
        }

        // Scavenger: seek dead matter (low-nutrient areas = recent death)
        if (o.species === Species.Scavenger) {
          const gi = Math.floor(o.x / GRID_SIZE) + Math.floor(o.y / GRID_SIZE) * gw;
          if (gi >= 0 && gi < nutrients.length && nutrients[gi] > 0.5) {
            o.energy += 5;
            nutrients[gi] -= 0.1;
          }
          o.vx += (Math.random() - 0.5) * 0.3;
          o.vy += (Math.random() - 0.5) * 0.3;
        }

        // Spore: drifts and spawns plants
        if (o.species === Species.Spore) {
          o.vx += (Math.random() - 0.5) * 0.1;
          o.vy += (Math.random() - 0.5) * 0.1;
          if (o.age > 100 && Math.random() < 0.02) {
            newOrgs.push(spawn(Math.random, w, h, Species.Plant, o.x, o.y));
            o.energy -= 10;
          }
        }

        // Parasite: attaches to herbivores, drains energy
        if (o.species === Species.Parasite) {
          let closest: Organism | null = null;
          let closestD = 50 * 50;
          for (const t of orgs) {
            if (t.species !== Species.Herbivore) continue;
            const d = dist2(o, t);
            if (d < closestD) { closest = t; closestD = d; }
          }
          if (closest) toward(o, closest, 0.25);
          if (closest && closestD < 8 * 8) {
            o.energy += 3;
            closest.energy -= 3;
          }
        }

        // Movement (non-plants)
        if (o.species !== Species.Plant) {
          const maxSpd = o.speed;
          const spd = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
          if (spd > maxSpd) { o.vx *= maxSpd / spd; o.vy *= maxSpd / spd; }
          o.x += o.vx;
          o.y += o.vy;
          o.vx *= 0.95;
          o.vy *= 0.95;
          // Random wander
          o.vx += (Math.random() - 0.5) * 0.1;
          o.vy += (Math.random() - 0.5) * 0.1;
        }

        // Toroidal wrap
        if (o.x < 0) o.x += w; if (o.x >= w) o.x -= w;
        if (o.y < 0) o.y += h; if (o.y >= h) o.y -= h;

        // Reproduction
        if (o.energy > o.reproThreshold && o.cooldown === 0 && orgs.length + newOrgs.length < 500) {
          const child = spawn(Math.random, w, h, o.species, o.x + (Math.random() - 0.5) * 10, o.y + (Math.random() - 0.5) * 10);
          // Mutation
          if (Math.random() < o.mutationRate) {
            child.speed *= 0.8 + Math.random() * 0.4;
            child.size *= 0.8 + Math.random() * 0.4;
            child.maxAge *= 0.9 + Math.random() * 0.2;
          }
          child.energy = o.energy * 0.4;
          o.energy *= 0.5;
          o.cooldown = 30 + Math.floor(Math.random() * 20);
          newOrgs.push(child);
        }

        // Death
        if (o.energy <= 0 || o.age > o.maxAge) {
          // Leave nutrients
          const gi = Math.floor(o.x / GRID_SIZE) + Math.floor(o.y / GRID_SIZE) * gw;
          if (gi >= 0 && gi < nutrients.length) nutrients[gi] = Math.min(1, nutrients[gi] + 0.3);
          orgs.splice(i, 1);
        }
      }

      orgs.push(...newOrgs);

      // Population maintenance: inject if too low
      if (tickRef.current % 100 === 0) {
        const counts = [0, 0, 0, 0, 0, 0];
        for (const o of orgs) counts[o.species]++;
        if (counts[Species.Plant] < 20) for (let i = 0; i < 10; i++) orgs.push(spawn(Math.random, w, h, Species.Plant));
        if (counts[Species.Herbivore] < 5) for (let i = 0; i < 5; i++) orgs.push(spawn(Math.random, w, h, Species.Herbivore));
        if (counts[Species.Predator] < 2) for (let i = 0; i < 2; i++) orgs.push(spawn(Math.random, w, h, Species.Predator));
        if (counts[Species.Spore] < 2) orgs.push(spawn(Math.random, w, h, Species.Spore));
      }

      organismsRef.current = orgs;
    };

    const render = () => {
      const { w, h } = worldRef.current;
      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, w, h);

      // Render nutrient field (very subtle)
      const gw = Math.ceil(w / GRID_SIZE);
      const nutrients = nutrientsRef.current;
      for (let i = 0; i < nutrients.length; i++) {
        if (nutrients[i] > 0.4) {
          const gx = (i % gw) * GRID_SIZE;
          const gy = Math.floor(i / gw) * GRID_SIZE;
          const a = (nutrients[i] - 0.4) * 0.1;
          ctx.fillStyle = `rgba(40, 60, 30, ${a})`;
          ctx.fillRect(gx, gy, GRID_SIZE, GRID_SIZE);
        }
      }

      // Render organisms
      for (const o of organismsRef.current) {
        const c = SPECIES_COLORS[o.species];
        const glow = SPECIES_GLOW[o.species];
        const energyFactor = Math.min(1, o.energy / 50);
        const alpha = 0.5 + energyFactor * 0.5;

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
        ctx.shadowColor = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.7})`;
        ctx.shadowBlur = glow * energyFactor;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    let frameCount = 0;
    const loop = () => {
      frameCount++;
      // Simulate every 2 frames for performance
      if (frameCount % 2 === 0) simulate();
      render();
      animRef.current = requestAnimationFrame(loop);
    };

    loop();

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [seed, spawn]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
