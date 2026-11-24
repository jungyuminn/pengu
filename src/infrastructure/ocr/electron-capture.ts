import { nativeImage, screen } from "electron";
import screenshot from "screenshot-desktop";
import type { CapturePort } from "./capture";

export class ElectronCapture implements CapturePort {
  async grabScreen(): Promise<{ buffer: Buffer; width: number; height: number }> {
    const display = screen.getPrimaryDisplay();
    const buffer = await screenshot();
    return {
      buffer,
      width: display.size.width,
      height: display.size.height,
    };
  }

  crop(buffer: Buffer, rect: { x: number; y: number; width: number; height: number }): Buffer {
    return nativeImage.createFromBuffer(buffer).crop(rect).toPNG();
  }
}
