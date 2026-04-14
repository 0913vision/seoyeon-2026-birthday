import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Full-screen confetti celebration overlay.
 * Triggers once when `boxHarvested` transitions false → true.
 * Uses a single <canvas> with requestAnimationFrame for smooth 60fps.
 * Auto-dismisses after ~7 seconds. pointer-events: none so it never
 * blocks touch.
 */

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    w: number;
    h: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    swayPhase: number;
    swaySpeed: number;
    swayAmp: number;
    opacity: number;
}

const COLORS = [
    '#FF9EC6', // pink
    '#FFB6D9', // light pink
    '#FFD700', // gold
    '#FFECB3', // pale gold
    '#A8E6CF', // mint
    '#B8F0D8', // light mint
    '#C9A0DC', // lavender
    '#E8D5F5', // light purple
    '#FFB347', // pastel orange
    '#87CEEB', // sky blue
];

const PARTICLE_COUNT = 65;
const DURATION_MS = 7000;
const FADE_START_MS = 5500;

function createParticle(canvasW: number): Particle {
    return {
        x: Math.random() * canvasW,
        y: -(Math.random() * canvasW * 0.5 + 20),
        vx: (Math.random() - 0.5) * 0.6,
        vy: 1.2 + Math.random() * 1.8,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayAmp: 0.8 + Math.random() * 1.2,
        opacity: 1,
    };
}

export function ConfettiOverlay() {
    const boxHarvested = useGameStore(s => s.boxHarvested);
    const prevRef = useRef(boxHarvested);
    const [active, setActive] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > DURATION_MS) {
            setActive(false);
            return;
        }

        // Global fade-out near the end
        const globalAlpha = elapsed > FADE_START_MS
            ? 1 - (elapsed - FADE_START_MS) / (DURATION_MS - FADE_START_MS)
            : 1;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const dpr = window.devicePixelRatio || 1;
        const particles = particlesRef.current;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Physics
            p.x += p.vx + Math.sin(p.swayPhase) * p.swayAmp;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            p.swayPhase += p.swaySpeed;

            // Recycle particles that fall off screen
            if (p.y > h / dpr + 20) {
                p.y = -(Math.random() * 40 + 10);
                p.x = Math.random() * w / dpr;
            }

            const alpha = globalAlpha * p.opacity;
            if (alpha <= 0) continue;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x * dpr, p.y * dpr);
            ctx.rotate(p.rotation);

            // Draw a rounded rectangle (paper/petal feel)
            const pw = p.w * dpr;
            const ph = p.h * dpr;
            const radius = 2 * dpr;
            ctx.beginPath();
            ctx.moveTo(-pw / 2 + radius, -ph / 2);
            ctx.lineTo(pw / 2 - radius, -ph / 2);
            ctx.quadraticCurveTo(pw / 2, -ph / 2, pw / 2, -ph / 2 + radius);
            ctx.lineTo(pw / 2, ph / 2 - radius);
            ctx.quadraticCurveTo(pw / 2, ph / 2, pw / 2 - radius, ph / 2);
            ctx.lineTo(-pw / 2 + radius, ph / 2);
            ctx.quadraticCurveTo(-pw / 2, ph / 2, -pw / 2, ph / 2 - radius);
            ctx.lineTo(-pw / 2, -ph / 2 + radius);
            ctx.quadraticCurveTo(-pw / 2, -ph / 2, -pw / 2 + radius, -ph / 2);
            ctx.closePath();

            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
        }

        rafRef.current = requestAnimationFrame(animate);
    }, []);

    // Detect the false→true transition
    useEffect(() => {
        if (!prevRef.current && boxHarvested) {
            setActive(true);
        }
        prevRef.current = boxHarvested;
    }, [boxHarvested]);

    // Start/stop animation loop
    useEffect(() => {
        if (!active) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Size to viewport
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        // Create particles
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
            createParticle(window.innerWidth)
        );
        startTimeRef.current = Date.now();

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [active, animate]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 20001,
                pointerEvents: 'none',
            }}
        />
    );
}
