import { existsSync } from "fs";
import { nativeImage } from "electron";
import path from "path";

export function appIcon() {
  const ico = path.join(__dirname, "../../assets/icons/pengu.ico");
  const png = path.join(__dirname, "../../assets/icons/pengu_icon.png");
  const file = existsSync(ico) ? ico : png;
  return nativeImage.createFromPath(file);
}
