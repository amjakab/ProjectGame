
import React, { useState } from 'react';
import Game from './components/Game';
import { GameStatus } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [narrative, setNarrative] = useState("");

  const startGame = () => {
    setStatus(GameStatus.PLAYING);
    setScore(0);
    setNarrative("");
  };

  const endGame = async (finalScore: number) => {
    setScore(finalScore);
    if (finalScore > highScore) setHighScore(finalScore);
    setStatus(GameStatus.GAMEOVER);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a short, cinematic, action-packed news snippet (max 2 sentences) about a rogue garbage truck driver named Brady who lead a high-stakes highway chase and fended off the police with heavy-duty pucks. Final score: ${finalScore}.`,
      });
      setNarrative(response.text || "The ultimate high-speed chase has finally come to an end.");
    } catch (err) {
      console.error("Narrative failed", err);
      setNarrative("Brady's run for glory ended in a cloud of diesel and debris.");
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white overflow-hidden selection:bg-blue-500">
      {status === GameStatus.START && (
        <div className="z-10 text-center space-y-8 p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-black font-racing tracking-tighter italic">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">BRADY'S</span>
            <br/>
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">GARBAGE RUN</span>
          </h1>
          <div className="space-y-4 text-zinc-400 font-medium">
            <p className="uppercase tracking-[0.2em] text-xs">A High-Stakes Driving Experience</p>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-700 to-transparent mx-auto"></div>
            <p className="text-lg">Dodge traffic. Outrun the law. Use tactical pucks.</p>
          </div>
          <button 
            onClick={startGame}
            className="group relative px-12 py-5 bg-white text-black font-bold text-2xl rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-white/40"
          >
            LAUNCH MISSION
          </button>
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest pt-4">
            A/D or ARROWS TO STEER • SPACE TO DEPLOY PUCKS
          </div>
        </div>
      )}

      {status === GameStatus.PLAYING && (
        <Game onGameOver={endGame} />
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="z-10 text-center space-y-8 p-12 bg-white/5 backdrop-blur-2xl border border-red-500/20 rounded-3xl max-w-lg shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <h2 className="text-5xl font-black font-racing text-red-500 italic">NEUTRALIZED</h2>
          <div className="space-y-1">
            <div className="text-4xl font-bold">{score.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 tracking-[0.3em] uppercase">DISTANCE SECURED</div>
          </div>
          
          <div className="p-6 bg-black/40 rounded-2xl border border-white/5 text-sm text-zinc-300 leading-relaxed font-medium">
            {narrative || "Analyzing intercept data..."}
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xl rounded-full shadow-lg transition-all"
            >
              RE-ENGAGE
            </button>
            <div className="text-xs text-zinc-500">PERSONAL BEST: {highScore.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Modern Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_#1e1b4b_0%,_transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_#1e1b4b_0%,_transparent_50%)]"></div>
      </div>
    </div>
  );
};

export default App;
