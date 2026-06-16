import { useEffect, useRef } from 'react';

// Component is currently unused in any route. Keep the implementation here for
// future reference but return null to prevent the O(n²) per-frame edge loop
// from burning CPU if ever mounted accidentally.
export function ParticleBackground() {
  return null;

  // eslint-disable-next-line no-unreachable
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      color: string;
      baseX: number;
      baseY: number;
      angle: number;
      speed: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      // Find the hero section's height or default to 800
      canvas.height = canvas.parentElement?.clientHeight || 800;
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Vibrant pastel colors matching the infinity gradient
    const colors = [
      'rgba(6, 182, 212, 0.5)',   // Cyan
      'rgba(99, 102, 241, 0.4)',  // Indigo
      'rgba(168, 85, 247, 0.4)',  // Purple
      'rgba(244, 63, 94, 0.3)',   // Rose
    ];

    // Initialize particles
    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor(window.innerWidth / 12); // Responsive count
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          baseX: Math.random() * canvas.width,
          baseY: Math.random() * canvas.height,
          radius: Math.random() * 2.5 + 1,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6 - 0.3, // Drift upwards
          angle: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.01,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };
    
    initParticles();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Fluid sinusoidal motion - enhanced flow
        p.angle += p.speed;
        p.x += Math.sin(p.angle) * 1.2 + p.vx;
        p.y += Math.cos(p.angle) * 0.8 + p.vy;

        // Wrap around screen
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      // Connect nearby particles to form a neural/flowing web
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Opacity based on distance
            const opacity = 1 - dist / 150;
            // Use a vibrant purple-indigo line color
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.25})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };
    
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-90"
    />
  );
}