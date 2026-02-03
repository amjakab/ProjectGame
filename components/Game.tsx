
import React, { useRef, useEffect, useState } from 'react';
import { TrafficCar, Puck, Garbage } from '../types';

interface GameProps {
  onGameOver: (score: number) => void;
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 750;
const ROAD_LANES = 3;
const LANE_WIDTH = CANVAS_WIDTH / ROAD_LANES;
const PLAYER_SPEED_X = 12; // Increased for tighter feel
const BASE_PLAYER_SPEED = 6;
const BOOST_SPEED = 14;

const Game: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pucks, setPucks] = useState(10);
  const [score, setScore] = useState(0);
  const [currentDisplaySpeed, setCurrentDisplaySpeed] = useState(0);

  const stateRef = useRef({
    player: {
      x: LANE_WIDTH * 1 + LANE_WIDTH / 2 - 35,
      y: 200,
      width: 70,
      height: 120,
      vx: 0,
      speed: BASE_PLAYER_SPEED,
      pucks: 10,
      boostTimer: 0,
      penaltyTimer: 0 // New: frames to slow down after collision
    },
    cop: {
      x: LANE_WIDTH * 1 + LANE_WIDTH / 2 - 25,
      y: 600,
      width: 50,
      height: 90,
      speed: 5.5,
      targetX: LANE_WIDTH * 1 + LANE_WIDTH / 2 - 25,
      flash: 0
    },
    traffic: [] as TrafficCar[],
    garbage: [] as Garbage[],
    pucks: [] as Puck[],
    keys: { left: false, right: false },
    offset: 0,
    frame: 0,
    score: 0,
    gameOver: false,
    lastSpawnedLanes: [] as number[]
  });

  const playVroom = () => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance("VROOM VROOM");
      msg.rate = 1.5;
      msg.pitch = 0.8;
      window.speechSynthesis.speak(msg);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') s.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') s.keys.right = true;
      if (e.key === ' ' && s.player.pucks > 0 && !s.gameOver) {
        s.pucks.push({
          x: s.player.x + s.player.width / 2 - 12,
          y: s.player.y + s.player.height,
          width: 24,
          height: 12,
          speed: 12
        });
        s.player.pucks--;
        setPucks(s.player.pucks);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') s.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') s.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const update = () => {
      const s = stateRef.current;
      if (s.gameOver) return;

      s.frame++;
      
      // Speed Calculation
      let targetSpeed = BASE_PLAYER_SPEED;
      if (s.player.boostTimer > 0) {
        s.player.boostTimer--;
        targetSpeed = BOOST_SPEED;
      }
      
      // Penalty logic
      if (s.player.penaltyTimer > 0) {
        s.player.penaltyTimer--;
        targetSpeed = Math.max(1.5, targetSpeed - 4.5);
      }

      // Smoothly transition actual speed
      s.player.speed += (targetSpeed - s.player.speed) * 0.1;
      
      s.score += s.player.speed > 8 ? 2 : 1;
      setScore(Math.floor(s.score));
      setCurrentDisplaySpeed(Math.floor(s.player.speed * 15)); // Scale for KM/H look

      // Scroll road
      s.offset = (s.offset + s.player.speed) % 100;

      // Tight Player Movement
      if (s.keys.left) s.player.vx = -PLAYER_SPEED_X;
      else if (s.keys.right) s.player.vx = PLAYER_SPEED_X;
      else s.player.vx *= 0.6; // Higher friction for "tighter" stopping

      s.player.x += s.player.vx;
      if (s.player.x < 5) s.player.x = 5;
      if (s.player.x > CANVAS_WIDTH - s.player.width - 5) s.player.x = CANVAS_WIDTH - s.player.width - 5;

      // Anti-Wall Spawn Logic
      if (s.frame % 45 === 0) {
        let lane = Math.floor(Math.random() * ROAD_LANES);
        const recent = s.lastSpawnedLanes.slice(-2);
        const uniqueRecent = new Set(recent);
        if (uniqueRecent.size === 2) {
          const missingLane = [0, 1, 2].find(l => !uniqueRecent.has(l));
          if (lane === missingLane) lane = recent[0];
        }
        s.lastSpawnedLanes.push(lane);
        if (s.lastSpawnedLanes.length > 5) s.lastSpawnedLanes.shift();

        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#ffffff'];
        const startX = lane * LANE_WIDTH + LANE_WIDTH / 2 - 25;
        s.traffic.push({
          x: startX,
          y: -150,
          width: 50,
          height: 90,
          speed: 2 + Math.random() * 2,
          type: 'sedan',
          color: colors[Math.floor(Math.random() * colors.length)],
          targetX: startX,
          lane: lane,
          isChangingLane: false
        });
      }

      // Rare Garbage Spawn
      if (s.frame % 300 === 0) {
        const side = Math.random() > 0.5 ? 10 : CANVAS_WIDTH - 40;
        s.garbage.push({
          x: side,
          y: -100,
          width: 30,
          height: 35,
          speed: 0,
          rotation: Math.random() * Math.PI * 2
        });
      }

      // Update Garbage
      s.garbage = s.garbage.filter(g => {
        g.y += s.player.speed;
        const dx = (s.player.x + s.player.width / 2) - (g.x + g.width / 2);
        const dy = (s.player.y + s.player.height / 2) - (g.y + g.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 80) {
          if (s.player.boostTimer <= 0) playVroom();
          s.player.boostTimer = 180;
          return false;
        }
        return g.y < CANVAS_HEIGHT + 100;
      });

      // Update Traffic & NPC Lane Switching
      s.traffic = s.traffic.filter(car => {
        car.y += (s.player.speed - car.speed);
        if (!car.isChangingLane && Math.random() < 0.008 && car.y > 0 && car.y < 400) {
          const nextLane = car.lane + (Math.random() > 0.5 ? 1 : -1);
          if (nextLane >= 0 && nextLane < ROAD_LANES) {
            car.lane = nextLane;
            car.targetX = car.lane * LANE_WIDTH + LANE_WIDTH / 2 - car.width / 2;
            car.isChangingLane = true;
          }
        }
        if (car.isChangingLane) {
          car.x += (car.targetX - car.x) * 0.08;
          if (Math.abs(car.x - car.targetX) < 1) { car.x = car.targetX; car.isChangingLane = false; }
        }
        
        // Collision Detection
        if (
          s.player.x < car.x + car.width - 8 &&
          s.player.x + s.player.width > car.x + 8 &&
          s.player.y < car.y + car.height - 8 &&
          s.player.y + s.player.height > car.y + 8
        ) {
          if (s.player.boostTimer > 0) return false; // Invincible when boosting
          s.player.penaltyTimer = 60; // 1 second slowdown
          return false;
        }
        return car.y < CANVAS_HEIGHT + 200;
      });

      // Update Pucks
      s.pucks = s.pucks.filter(p => {
        p.y += p.speed;
        if (p.x < s.cop.x + s.cop.width && p.x + p.width > s.cop.x && p.y < s.cop.y + s.cop.height && p.y + p.height > s.cop.y) {
          s.cop.y = Math.min(CANVAS_HEIGHT - 100, s.cop.y + 80);
          return false;
        }
        return p.y < CANVAS_HEIGHT;
      });

      // Cop logic
      s.cop.flash = (s.cop.flash + 1) % 20;
      s.cop.targetX = s.player.x + s.player.width / 2 - s.cop.width / 2;
      s.cop.x += (s.cop.targetX - s.cop.x) * 0.05;

      if (s.player.speed < 4) s.cop.y -= 5;
      else if (s.player.speed > 10) s.cop.y += 2.5;
      else s.cop.y -= 0.5;

      if (s.player.x < s.cop.x + s.cop.width && s.player.x + s.player.width > s.cop.x && s.player.y < s.cop.y + s.cop.height && s.player.y + s.player.height > s.cop.y) {
        s.gameOver = true;
        onGameOver(s.score);
      }

      if (s.frame % 150 === 0 && s.player.pucks < 10) {
        s.player.pucks++;
        setPucks(s.player.pucks);
      }
    };

    const drawGarbage = (g: Garbage) => {
      ctx.save();
      ctx.translate(g.x + g.width / 2, g.y + g.height / 2);
      ctx.rotate(g.rotation);
      ctx.fillStyle = '#4b5563';
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.quadraticCurveTo(0, -20, 10, 10);
      ctx.lineTo(10, 15);
      ctx.lineTo(-10, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(-2, -18, 4, 6);
      ctx.restore();
    };

    const drawFlames = (x: number, y: number, w: number) => {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const fx = x + (w / 4) + Math.random() * (w / 2);
        const fy = y - 5 - Math.random() * 50;
        const size = 12 + Math.random() * 18;
        const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, size);
        grad.addColorStop(0, '#fde047');
        grad.addColorStop(0.3, '#f97316');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(fx, fy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawTruck = (x: number, y: number, w: number, h: number, color: string, isCop: boolean = false) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x + 5, y + 15, w - 10, 20, 4);
      ctx.fill();
      if (isCop) {
        const isRed = stateRef.current.cop.flash < 10;
        ctx.fillStyle = isRed ? '#ef4444' : '#3b82f6';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 25;
        ctx.fillRect(x + 10, y + 5, w - 20, 8);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 8, y + 45, w - 16, h - 55);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<3; i++) ctx.strokeRect(x+12, y + 50 + (i*20), w-24, 15);
      }
      ctx.restore();
    };

    const draw = () => {
      const s = stateRef.current;
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#111827');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
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

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, 15, CANVAS_HEIGHT);
      ctx.fillRect(CANVAS_WIDTH - 15, 0, 15, CANVAS_HEIGHT);

      s.garbage.forEach(drawGarbage);
      s.traffic.forEach(car => drawTruck(car.x, car.y, car.width, car.height, car.color));
      s.pucks.forEach(p => {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.ellipse(p.x + 12, p.y + 6, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      
      if (s.player.boostTimer > 0) drawFlames(s.player.x, s.player.y, s.player.width);
      
      // Flash red if in penalty
      const playerColor = s.player.penaltyTimer > 0 && s.frame % 10 < 5 ? '#7f1d1d' : (s.player.boostTimer > 0 ? '#fbbf24' : '#10b981');
      drawTruck(s.player.x, s.player.y, s.player.width, s.player.height, playerColor);
      drawTruck(s.cop.x, s.cop.y, s.cop.width, s.cop.height, '#1e293b', true);

      if (s.player.speed > 8) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        for(let i=0; i<12; i++) {
          const lx = Math.random() * CANVAS_WIDTH;
          const ly = Math.random() * CANVAS_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx, ly + 40);
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
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onGameOver]);

  return (
    <div className="relative group overflow-hidden rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-x-0 top-0 p-8 flex justify-between items-start pointer-events-none z-20">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-shadow">Operation Score</div>
          <div className="text-3xl font-black font-racing italic tracking-tighter text-white drop-shadow-lg">
            {score.toLocaleString()}
          </div>
        </div>
        
        <div className="text-right space-y-4">
          <div className="space-y-1">
             <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-shadow">Tactical Pucks</div>
             <div className="flex gap-1 justify-end">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={`h-4 w-1.5 rounded-full transition-all duration-500 ${i < pucks ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-white/10'}`} />
                ))}
             </div>
          </div>
          
          {/* Speedometer UI Component */}
          <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex flex-col items-center">
             <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Velocity</div>
             <div className="text-2xl font-black font-racing text-white tabular-nums leading-none">
                {currentDisplaySpeed}
                <span className="text-[10px] ml-1 text-zinc-500 italic">KM/H</span>
             </div>
             <div className="mt-2 h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                <div 
                   className={`h-full transition-all duration-100 ${stateRef.current.player.boostTimer > 0 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                   style={{ width: `${(currentDisplaySpeed / 250) * 100}%` }}
                />
             </div>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block bg-[#0a0a0c]" />
      
      {stateRef.current.player.boostTimer > 0 && (
        <div className="absolute inset-0 pointer-events-none animate-pulse border-4 border-yellow-500/20 z-10"></div>
      )}
      {stateRef.current.player.penaltyTimer > 0 && (
        <div className="absolute inset-0 pointer-events-none bg-red-900/10 z-10"></div>
      )}
    </div>
  );
};

export default Game;
