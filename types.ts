
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Player extends Entity {
  vx: number;
  pucks: number;
  boostTimer: number; // Frames remaining for speed boost
}

export interface TrafficCar extends Entity {
  type: 'sedan' | 'suv' | 'sports';
  color: string;
  targetX: number;
  lane: number;
  isChangingLane: boolean;
}

export interface Garbage extends Entity {
  rotation: number;
}

export interface CopCar extends Entity {
  flash: number;
  targetX: number;
}

export interface Puck extends Entity {}

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}
