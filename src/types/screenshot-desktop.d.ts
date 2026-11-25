declare module "screenshot-desktop" {
  interface ScreenshotOptions {
    format?: string;
    screen?: string | number;
  }

  interface DisplayInfo {
    id: string;
    name: string;
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    width?: number;
    height?: number;
  }

  interface Screenshot {
    (options?: ScreenshotOptions): Promise<Buffer>;
    listDisplays(): Promise<DisplayInfo[]>;
  }

  const screenshot: Screenshot;
  export = screenshot;
}
