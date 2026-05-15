import { useEffect, useRef } from "react";

/**
 * Estela de gotas de sangre que sigue al cursor. Pensado para las páginas
 * de auth (login, register, forgot, recovery): se monta en el layout público.
 *
 * Implementación: canvas full-screen `pointer-events: none` con un buffer
 * circular de partículas. Cada movimiento del mouse agrega un punto con
 * velocidad aleatoria; en cada frame las partículas caen por gravedad y se
 * desvanecen. Se desactiva si el dispositivo es coarse-pointer (touch) o si
 * el usuario prefiere movimiento reducido.
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Vida 1 → 0; el alpha y el radio dependen de ella. */
  life: number;
  /** Radio inicial. */
  radius: number;
}

const MAX_PARTICLES = 120;
const SPAWN_PER_MOVE = 2;
const GRAVITY = 0.08;
const FADE = 0.018;

export function BloodCursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si el usuario está en touch o pide menos movimiento, no activamos.
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    const reducesMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (isCoarse || reducesMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let rafId = 0;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    function resize() {
      if (!canvas) return;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(x: number, y: number) {
      for (let i = 0; i < SPAWN_PER_MOVE; i++) {
        // Acumulamos hasta MAX_PARTICLES; al pasarse, descartamos las más viejas.
        if (particles.length >= MAX_PARTICLES) particles.shift();
        particles.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 4,
          vx: (Math.random() - 0.5) * 0.6,
          // Empuje inicial leve hacia abajo: caída natural.
          vy: Math.random() * 0.4 + 0.1,
          life: 1,
          radius: Math.random() * 2.2 + 1.2,
        });
      }
    }

    function tick() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alive: Particle[] = [];
      for (const p of particles) {
        p.life -= FADE;
        if (p.life <= 0) continue;
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        const r = p.radius * p.life;
        // Color rojo sangre con halo más claro. Usamos un gradiente radial
        // para que el centro sea más brillante.
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
        grad.addColorStop(0, `rgba(160, 18, 28, ${p.life})`);
        grad.addColorStop(0.6, `rgba(120, 10, 16, ${p.life * 0.7})`);
        grad.addColorStop(1, `rgba(80, 5, 10, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
        ctx.fill();

        alive.push(p);
      }
      particles = alive;
      rafId = requestAnimationFrame(tick);
    }

    function onMove(e: MouseEvent) {
      spawn(e.clientX, e.clientY);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      particles = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
