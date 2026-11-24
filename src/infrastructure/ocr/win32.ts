import koffi from "koffi";

const user32 = koffi.load("user32.dll");
const gdi32 = koffi.load("gdi32.dll");

const HANDLE = koffi.pointer("HANDLE", koffi.opaque());
const HWND = koffi.alias("HWND", HANDLE);
const HDC = koffi.alias("HDC", HANDLE);
const HBITMAP = koffi.alias("HBITMAP", HANDLE);
const HGDIOBJ = koffi.alias("HGDIOBJ", HANDLE);

export const RECT = koffi.struct("RECT", {
  left: "long",
  top: "long",
  right: "long",
  bottom: "long",
});

export const POINT = koffi.struct("POINT", {
  x: "long",
  y: "long",
});

export const BITMAPINFOHEADER = koffi.struct("BITMAPINFOHEADER", {
  biSize: "uint32",
  biWidth: "int32",
  biHeight: "int32",
  biPlanes: "int16",
  biBitCount: "int16",
  biCompression: "uint32",
  biSizeImage: "uint32",
  biXPelsPerMeter: "int32",
  biYPelsPerMeter: "int32",
  biClrUsed: "uint32",
  biClrImportant: "uint32",
});

export const FindWindowW = user32.func(
  "HWND __stdcall FindWindowW(const char16_t *lpClassName, const char16_t *lpWindowName)",
);
export const GetForegroundWindow = user32.func("HWND __stdcall GetForegroundWindow()");
export const GetAncestor = user32.func("HWND __stdcall GetAncestor(HWND hwnd, uint32 gaFlags)");
export const GetClientRect = user32.func("bool __stdcall GetClientRect(HWND hWnd, _Out_ RECT *lpRect)");
export const ClientToScreen = user32.func("bool __stdcall ClientToScreen(HWND hWnd, _Inout_ POINT *lpPoint)");
export const GA_ROOT = 2;
export const GetDC = user32.func("HDC __stdcall GetDC(HWND hWnd)");
export const ReleaseDC = user32.func("int __stdcall ReleaseDC(HWND hWnd, HDC hDC)");
export const PrintWindow = user32.func("bool __stdcall PrintWindow(HWND hwnd, HDC hdcBlt, uint32 nFlags)");

export const CreateCompatibleDC = gdi32.func("HDC __stdcall CreateCompatibleDC(HDC hdc)");
export const CreateCompatibleBitmap = gdi32.func("HBITMAP __stdcall CreateCompatibleBitmap(HDC hdc, int cx, int cy)");
export const SelectObject = gdi32.func("HGDIOBJ __stdcall SelectObject(HDC hdc, HGDIOBJ h)");
export const BitBlt = gdi32.func(
  "bool __stdcall BitBlt(HDC hdc, int x, int y, int cx, int cy, HDC src, int x1, int y1, uint32 rop)",
);
export const GetDIBits = gdi32.func(
  "int __stdcall GetDIBits(HDC hdc, HBITMAP hbm, uint32 start, uint32 lines, void *bits, _Inout_ BITMAPINFOHEADER *info, uint32 usage)",
);
export const DeleteObject = gdi32.func("bool __stdcall DeleteObject(HGDIOBJ ho)");
export const DeleteDC = gdi32.func("bool __stdcall DeleteDC(HDC hdc)");

export const SRCCOPY = 0x00cc0020;
export const PW_RENDERFULLCONTENT = 2;
