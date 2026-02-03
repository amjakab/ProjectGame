
import React, { useRef, useEffect, useState } from 'react';
import { TrafficCar, Puck } from '../types';

interface GameProps {
  onGameOver: (score: number) => void;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 750;
const ROAD_LANES = 3;
const LANE_WIDTH = CANVAS_WIDTH / ROAD_LANES;

const Game: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pucks, setPucks] = useState(10);
  const [score, setScore] = useState(0);

  const stateRef = useRef({
    player: {
      x: LANE_WIDTH * 1 + LANE_WIDTH / 2 - 35,
      y: 200,
      width: 70,
      height: 120,
      targetX: LANE_WIDTH * 1 + LANE_WIDTH / 2 - 35,
      lane: 1,
      speed: 6,
      pucks: 10
    },
    cop: {
      x: LANE_WIDTH * 1 + LANE_WIDTH / 2 - 25,
      y: 600,
      width: 50,
      height: 90,
      speed: 5.5,
      targetLane: 1,
      flash: 0
    },
    traffic: [] as TrafficCar[],
    pucks: [] as Puck[],
    offset: 0,
    frame: 0,
    score: 0,
    gameOver: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.gameOver) return;

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        s.player.lane = Math.max(0, s.player.lane - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        s.player.lane = Math.min(ROAD_LANES - 1, s.player.lane + 1);
      } else if (e.key === ' ' && s.player.pucks > 0) {
        s.pucks.push({
          x: s.player.x + s.player.width / 2 - 12,
          y: s.player.y + s.player.height,
          width: 24,
          height: 12,
          speed: 10
        });
        s.player.pucks--;
        setPucks(s.player.pucks);
      }
      s.player.targetX = s.player.lane * LANE_WIDTH + LANE_WIDTH / 2 - s.player.width / 2;
    };

    window.addEventListener('keydown', handleKeyDown);

    const update = () => {
      const s = stateRef.current;
      if (s.gameOver) return;

      s.frame++;
      s.score += 1;
      setScore(s.score);

      // Scroll road
      s.offset = (s.offset + s.player.speed) % 100;

      // Smooth player movement
      s.player.x += (s.player.targetX - s.player.x) * 0.15;

      // Spawn traffic
      if (s.frame % 45 === 0) {
        const lane = Math.floor(Math.random() * ROAD_LANES);
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#ffffff'];
        s.traffic.push({
          x: lane * LANE_WIDTH + LANE_WIDTH / 2 - 25,
          y: -150,
          width: 50,
          height: 90,
          speed: 2 + Math.random() * 3,
          type: 'sedan',
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      // Update Traffic
      s.traffic = s.traffic.filter(car => {
        car.y += (s.player.speed - car.speed);
        
        // Collision with player
        if (
          s.player.x < car.x + car.width - 5 &&
          s.player.x + s.player.width > car.x + 5 &&
          s.player.y < car.y + car.height - 5 &&
          s.player.y + s.player.height > car.y + 5
        ) {
          s.player.speed = 2; // Drastic slow down
          setTimeout(() => { s.player.speed = 6; }, 500);
          return false;
        }
        return car.y < CANVAS_HEIGHT + 200;
      });

      // Update Pucks
      s.pucks = s.pucks.filter(p => {
        p.y += p.speed;
        // Check puck hit cop
        if (
          p.x < s.cop.x + s.cop.width &&
          p.x + p.width > s.cop.x &&
          p.y < s.cop.y + s.cop.height &&
          p.y + p.height > s.cop.y
        ) {
          s.cop.y = Math.min(CANVAS_HEIGHT - 100, s.cop.y + 60);
          return false;
        }
        return p.y < CANVAS_HEIGHT;
      });

      // Update Cop Logic
      s.cop.flash = (s.cop.flash + 1) % 20;
      // Cop follows player lane
      if (s.frame % 30 === 0) s.cop.targetLane = s.player.lane;
      const targetCopX = s.cop.targetLane * LANE_WIDTH + LANE_WIDTH / 2 - s.cop.width / 2;
      s.cop.x += (targetCopX - s.cop.x) * 0.05;

      // Cop speed dynamics
      const desiredY = 500; // Hover around this area
      if (s.player.speed < 4) {
        // Player hit something, cop zooms in
        s.cop.y -= 4;
      } else {
        // Normal chase
        const catchSpeed = 0.4;
        s.cop.y -= catchSpeed;
      }

      // Game Over Condition: Cop hits player
      if (
        s.player.x < s.cop.x + s.cop.width &&
        s.player.x + s.player.width > s.cop.x &&
        s.player.y < s.cop.y + s.cop.height &&
        s.player.y + s.player.height > s.cop.y
      ) {
        s.gameOver = true;
        onGameOver(s.score);
      }

      // Regen pucks
      if (s.frame % 150 === 0 && s.player.pucks < 10) {
        s.player.pucks++;
        setPucks(s.player.pucks);
      }
    };

    const drawTruck = (x: number, y: number, w: number, h: number, color: string, isCop: boolean = false) => {
      ctx.save();
      
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 10;

      // Body
      const gradient = ctx.createLinearGradient(x, y, x + w, y);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#fff4');
      gradient.addColorStop(1, color);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      const radius = 8;
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 15, w - 10, 20, 4);
      ctx.fill();

      // Top Highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isCop) {
        // Light bar
        const isRed = stateRef.current.cop.flash < 10;
        ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;
        ctx.fillRect(x + 10, y + 5, w - 20, 8);
        
        // Headlights (backwards since it's chasing)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(x + 10, y + 5, 4, 0, Math.PI * 2);
        ctx.arc(x + w - 10, y + 5, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Garbage Container details
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 8, y + 45, w - 16, h - 55);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<3; i++) {
            ctx.strokeRect(x+12, y + 50 + (i*20), w-24, 15);
        }
      }

      ctx.restore();
    };

    const drawPuck = (x: number, y: number) => {
      ctx.save();
      ctx.fillStyle = '#111';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 6, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Top face
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 3, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      const s = stateRef.current;
      
      // Road Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#111827');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Lanes
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 4;
      ctx.setLineDash([40, 60]);
      ctx.lineDashOffset = -s.offset * 2;
      for (let i = 1; i < ROAD_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(i * LANE_WIDTH, 0);
        ctx.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Road Glow (Bottom)
      const glowGrad = ctx.createRadialGradient(
          s.cop.x + s.cop.width/2, s.cop.y + s.cop.height/2, 20,
          s.cop.x + s.cop.width/2, s.cop.y + s.cop.height/2, 150
      );
      glowGrad.addColorStop(0, s.cop.flash < 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Entities
      s.traffic.forEach(car => drawTruck(car.x, car.y, car.width, car.height, car.color));
      s.pucks.forEach(p => drawPuck(p.x, p.y));
      
      drawTruck(s.player.x, s.player.y, s.player.width, s.player.height, '#10b981');
      drawTruck(s.cop.x, s.cop.y, s.cop.width, s.cop.height, '#1e293b', true);

      // Motion Blur / Speed lines
      if (s.player.speed > 5) {
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          for(let i=0; i<10; i++) {
              const lx = Math.random() * CANVAS_WIDTH;
              const ly = Math.random() * CANVAS_HEIGHT;
              ctx.beginPath();
              ctx.moveTo(lx, ly);
              ctx.lineTo(lx, ly + 20);
              ctx.stroke();
          }
      }
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onGameOver]);

  return (
    <div className="relative group overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      {/* HUD Overlay */}
      <div className="absolute inset-x-0 top-0 p-8 flex justify-between items-start pointer-events-none z-20">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation Score</div>
          <div className="text-3xl font-black font-racing italic tracking-tighter text-white drop-shadow-md">
            {score.toLocaleString()}
          </div>
        </div>
        
        <div className="text-right space-y-4">
          <div className="space-y-1">
             <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tactical Pucks</div>
             <div className="flex gap-1 justify-end">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-4 w-1.5 rounded-full transition-all duration-500 ${
                      i < pucks ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/10'
                    }`}
                  />
                ))}
             </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
             <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Interceptor Distance</div>
             <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                <div 
                   className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
                   style={{ width: `${Math.max(5, 100 - (stateRef.current.cop.y - stateRef.current.player.y) / 5)}%` }}
                ></div>
             </div>
          </div>
        </div>
      </div>

      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT}
        className="block bg-[#0a0a0c]"
      />
      
      {/* Visual Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
};

export default Game;
