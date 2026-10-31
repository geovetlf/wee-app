import React, { useEffect, useRef } from 'react';
import type { EstadoDelCerebro } from './SistemaDeWeeBrain';

/*
 * EL CEREBRO DE WEË BRAIN EN LA WEB: UNA RED DORADA POR LA QUE CORREN RAYOS.
 *
 * Se dibuja, no se reproduce: la silueta y sus nodos salen de una semilla fija, así
 * que es el mismo cerebro en cada visita, y lo único que cambia son los rayos.
 * Corren más cuando piensa, y se quedan quietos para quien pidió menos movimiento.
 */

/* El contorno, de perfil y mirando a la izquierda, sobre un lienzo de 100 × 100. */
const SILUETA: readonly (readonly [number, number])[] = [
  [12, 56], [8, 47], [10, 37], [15, 29], [22, 22], [31, 16], [42, 12], [54, 11], [65, 13], [75, 18], [83, 25], [89, 34],
  [92, 44], [91, 53], [87, 60], [80, 64], [84, 70], [82, 77], [74, 81], [65, 79], [60, 73], [59, 82], [56, 91], [50, 91],
  [50, 80], [47, 70], [38, 70], [30, 73], [22, 71], [15, 65],
];

interface Punto { x: number; y: number }
interface Red { nodos: Punto[]; aristas: [number, number][]; vecinos: number[][] }

const dentro = (x: number, y: number): boolean => {
  let adentro = false;
  for (let i = 0, j = SILUETA.length - 1; i < SILUETA.length; j = i++) {
    const [xi, yi] = SILUETA[i];
    const [xj, yj] = SILUETA[j];
    const cruza = yi - y > 0 !== yj - y > 0;
    if (cruza && ((xj - xi) * (y - yi)) / (yj - yi) + xi - x > 0) adentro = !adentro;
  }
  return adentro;
};

/* Un generador con semilla: el mismo dibujo siempre. */
const azarDe = (semilla: number) => () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
};

const construirRed = (): Red => {
  const azar = azarDe(20261030);
  const nodos: Punto[] = SILUETA.map(([x, y]) => ({ x, y }));
  for (let y = 14; y < 90; y += 7.2) {
    for (let x = 10; x < 92; x += 7.2) {
      const p = { x: x + (azar() - 0.5) * 4.6, y: y + (azar() - 0.5) * 4.6 };
      if (dentro(p.x, p.y)) nodos.push(p);
    }
  }
  const vistas = new Set<string>();
  const aristas: [number, number][] = [];
  const vecinos: number[][] = nodos.map(() => []);
  const unir = (a: number, b: number) => {
    const clave = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || vistas.has(clave)) return;
    vistas.add(clave);
    aristas.push([a, b]);
    vecinos[a].push(b);
    vecinos[b].push(a);
  };
  SILUETA.forEach((_, i) => unir(i, (i + 1) % SILUETA.length));
  nodos.forEach((n, i) => {
    nodos
      .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y), m }))
      .filter(({ j, d, m }) => j !== i && d < 14 && dentro((n.x + m.x) / 2, (n.y + m.y) / 2))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ j }) => unir(i, j));
  });
  return { nodos, aristas, vecinos };
};

const RED = construirRed();

const RITMO: Record<EstadoDelCerebro, { rayos: number; vida: number; viva: string; brillo: string }> = {
  quieto: { rayos: 3.2, vida: 620, viva: '#FFD76A', brillo: 'rgba(245, 183, 49, 0.9)' },
  pensando: { rayos: 9, vida: 460, viva: '#FFE9A8', brillo: 'rgba(255, 201, 77, 1)' },
  respondiendo: { rayos: 6, vida: 520, viva: '#FFE9A8', brillo: 'rgba(255, 201, 77, 1)' },
  tropiezo: { rayos: 0.5, vida: 700, viva: '#C9CDD4', brillo: 'rgba(201, 205, 212, 0.6)' },
};

interface Rayo { camino: Punto[]; nace: number; vida: number }

/* Un rayo recorre aristas de verdad, y entre nodo y nodo se quiebra. */
const lanzarRayo = (ahora: number, vida: number): Rayo => {
  let actual = Math.floor(Math.random() * RED.nodos.length);
  const tramos = 3 + Math.floor(Math.random() * 5);
  const camino: Punto[] = [RED.nodos[actual]];
  const pisados = new Set([actual]);
  for (let i = 0; i < tramos; i++) {
    const libres = RED.vecinos[actual].filter((v) => !pisados.has(v));
    if (libres.length === 0) break;
    const siguiente = libres[Math.floor(Math.random() * libres.length)];
    const de = RED.nodos[actual];
    const a = RED.nodos[siguiente];
    camino.push({ x: (de.x + a.x) / 2 + (Math.random() - 0.5) * 3.2, y: (de.y + a.y) / 2 + (Math.random() - 0.5) * 3.2 }, a);
    pisados.add(siguiente);
    actual = siguiente;
  }
  return { camino, nace: ahora, vida };
};

const CerebroElectrico: React.FC<{ tamano: number; estado: EstadoDelCerebro }> = ({ tamano, estado }) => {
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const ritmo = useRef(RITMO[estado]);
  ritmo.current = RITMO[estado];

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const densidad = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = tamano * densidad;
    canvas.height = tamano * densidad;
    const k = (tamano * densidad) / 100;
    const quieto = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let rayos: Rayo[] = [];
    let previo = performance.now();
    let cuadro = 0;

    const pintar = (ahora: number) => {
      const r = ritmo.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* La red en reposo: fina, para que el rayo sea lo que se mira. */
      ctx.lineWidth = 0.46 * k;
      ctx.strokeStyle = 'rgba(255, 201, 77, 0.78)';
      ctx.beginPath();
      for (const [a, b] of RED.aristas) {
        ctx.moveTo(RED.nodos[a].x * k, RED.nodos[a].y * k);
        ctx.lineTo(RED.nodos[b].x * k, RED.nodos[b].y * k);
      }
      ctx.stroke();

      RED.nodos.forEach((n, i) => {
        const pulso = quieto ? 0.9 : 0.7 + 0.3 * Math.sin(ahora / 520 + i * 1.7);
        ctx.fillStyle = `rgba(255, 215, 106, ${pulso})`;
        ctx.beginPath();
        ctx.arc(n.x * k, n.y * k, (i % 5 === 0 ? 1.5 : 0.9) * k, 0, Math.PI * 2);
        ctx.fill();
      });

      if (quieto) return;

      const pasado = Math.min(ahora - previo, 100);
      previo = ahora;
      if (Math.random() < (r.rayos * pasado) / 1000) rayos.push(lanzarRayo(ahora, r.vida));
      rayos = rayos.filter((rayo) => rayo.vida - (ahora - rayo.nace) > 0);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const rayo of rayos) {
        const t = (ahora - rayo.nace) / rayo.vida;
        const hasta = Math.max(2, Math.ceil(Math.min(t * 2.4, 1) * rayo.camino.length));
        ctx.globalAlpha = t < 0.45 ? 1 : (1 - t) / 0.55;
        ctx.shadowColor = r.brillo;
        ctx.shadowBlur = 3.4 * k;
        ctx.strokeStyle = r.viva;
        ctx.lineWidth = 0.95 * k;
        ctx.beginPath();
        rayo.camino.slice(0, hasta).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * k, p.y * k) : ctx.lineTo(p.x * k, p.y * k)));
        ctx.stroke();
        const punta = rayo.camino[hasta - 1];
        ctx.fillStyle = '#FFF6D8';
        ctx.beginPath();
        ctx.arc(punta.x * k, punta.y * k, 1.2 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      cuadro = requestAnimationFrame(pintar);
    };

    cuadro = requestAnimationFrame(pintar);
    return () => cancelAnimationFrame(cuadro);
  }, [tamano]);

  return (
    <div
      aria-hidden
      style={{
        width: tamano,
        height: tamano,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 50% 42%, #2A2110 0%, #14110A 62%, #0B0A07 100%)',
        boxShadow: '0 0 0 1px rgba(245, 183, 49, 0.35), 0 10px 34px rgba(245, 183, 49, 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas ref={lienzo} style={{ width: tamano * 0.84, height: tamano * 0.84 }} />
    </div>
  );
};

export default CerebroElectrico;
