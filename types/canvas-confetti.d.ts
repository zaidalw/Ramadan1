declare module "canvas-confetti" {
  export type ConfettiOrigin = { x?: number; y?: number };

  export type ConfettiOptions = {
    angle?: number;
    colors?: string[];
    decay?: number;
    gravity?: number;
    origin?: ConfettiOrigin;
    particleCount?: number;
    scalar?: number;
    shapes?: Array<"square" | "circle">;
    spread?: number;
    startVelocity?: number;
    ticks?: number;
    zIndex?: number;
  };

  export interface ConfettiGlobal {
    (options?: ConfettiOptions): void;
  }

  const confetti: ConfettiGlobal;
  export default confetti;
}

