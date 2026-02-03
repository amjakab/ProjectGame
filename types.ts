
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Player extends Entity {
  lane: number;
  targetX: number;
  pucks: number;
}

export interface TrafficCar extends Entity {
  type: 'sedan' | 'suv' | 'sports';
  color: string;
}

export interface CopCar extends Entity {
  flashing: boolean;
}

export interface Puck extends Entity {}

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}
