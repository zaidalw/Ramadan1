declare module "pngjs" {
  export class PNG {
    static sync: {
      write(png: PNG): Buffer;
    };

    width: number;
    height: number;
    data: Uint8Array;

    constructor(opts: { width: number; height: number });
  }
}

