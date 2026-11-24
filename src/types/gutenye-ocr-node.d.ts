declare module "@gutenye/ocr-node" {
  export interface OcrLine {
    text: string;
    mean: number;
  }

  export interface OcrSession {
    detect(image: string | { data: Uint8Array | Buffer; width: number; height: number }): Promise<{
      texts: OcrLine[];
    }>;
  }

  const Ocr: {
    create(options?: {
      models?: {
        detectionPath: string;
        recognitionPath: string;
        dictionaryPath: string;
      };
      onnxOptions?: object;
    }): Promise<OcrSession>;
  };

  export default Ocr;
}
