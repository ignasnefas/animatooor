/**
 * ASCII Art Renderer (Optimized)
 * High-performance ASCII rendering with caching and reduced sampling
 */

export type CharsetType = 'standard' | 'dense' | 'minimal' | 'blocks' | 'braille';

// Ordered from darkest to brightest
const charsets: Record<CharsetType, string> = {
  standard: ' .:-=+*#%@',
  dense: ' ░▒▓█',
  minimal: ' .*#',
  blocks: ' ▁▂▃▄▅▆▇█',
  braille: ' ⠁⠃⠇⠏⠟⠿⡿⣿',
};

export interface ASCIICellData {
  char: string;
  r: number;
  g: number;
  b: number;
  brightness: number;
}

export interface ASCIIFrameData {
  cells: ASCIICellData[][];
  cols: number;
  rows: number;
}

export interface ASCIIRenderOptions {
  charset: CharsetType;
  resolution: number;       // width in characters
  invert?: boolean;
  contrast?: number;        // 0-3, default 1.2
  colorMode?: boolean;      // true = use original colors, false = monochrome
  textColor?: string;       // hex color for monochrome mode
  backgroundColor?: string; // hex background
  gamma?: number;           // gamma correction (0.5-2.0)
}

// Cache for hex to RGB conversions
const hexToRGBCache = new Map<string, [number, number, number]>();

/**
 * Gets perceived brightness from RGB values (0-1)
 * Uses ITU-R BT.709 luminance coefficients
 */
function getLuminance(r: number, g: number, b: number): number {
  // Optimized: avoid division, use precomputed reciprocal
  return 0.0083 * r + 0.0280 * g + 0.0002 * b; // precomputed /255
}

/**
 * Converts canvas ImageData into a grid of ASCII cells with color info.
 * Samples blocks of pixels and maps each block to a character based on average brightness.
 * Optimized with reduced sampling and better cache locality.
 */
export function imageDataToASCIICells(
  imageData: ImageData,
  width: number,
  height: number,
  options: ASCIIRenderOptions
): ASCIIFrameData {
  const {
    charset,
    resolution,
    invert = false,
    contrast = 1.2,
    gamma = 1.0,
    backgroundColor = '#000000',
  } = options;

  const chars = charsets[charset] || charsets.standard;
  const charsLen = chars.length;
  const cols = resolution;
  // Character cells are roughly 2x taller than wide in monospace fonts
  const cellWidth = width / cols;
  const cellHeight = cellWidth * 2;
  const rows = Math.floor(height / cellHeight);

  const data = imageData.data;
  const cells: ASCIICellData[][] = [];

  // Pre-compute gamma/contrast values if needed
  const logGamma = gamma !== 1.0 ? 1.0 / gamma : 1.0;

  // Get background color to detect and skip background pixels
  const [bgR, bgG, bgB] = hexToRGB(backgroundColor);

  const cellW = Math.floor(cellWidth);
  const cellH = Math.floor(cellHeight);

  for (let row = 0; row < rows; row++) {
    const rowCells: ASCIICellData[] = [];
    const y0 = row * cellH;
    const y1 = Math.min(y0 + cellH, height);

    for (let col = 0; col < cols; col++) {
      const x0 = col * cellW;
      const x1 = Math.min(x0 + cellW, width);

      let totalR = 0, totalG = 0, totalB = 0;
      let sampleCount = 0;

      // Reduced sampling: sample every 2nd pixel instead of every Nth
      const stepX = Math.max(1, Math.floor((x1 - x0) / 8));
      const stepY = Math.max(1, Math.floor((y1 - y0) / 8));

      for (let py = y0; py < y1; py += stepY) {
        const rowOffset = py * width;
        for (let px = x0; px < x1; px += stepX) {
          const idx = (rowOffset + px) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          sampleCount++;
        }
      }

      if (sampleCount === 0) {
        rowCells.push({ char: ' ', r: 0, g: 0, b: 0, brightness: 0 });
        continue;
      }

      const sampleCountRecip = 1 / sampleCount;
      const avgR = totalR * sampleCountRecip;
      const avgG = totalG * sampleCountRecip;
      const avgB = totalB * sampleCountRecip;

      // Check if pixel is background color (with tolerance for anti-aliasing)
      // If so, render as space to avoid ASCII artifacts on empty background
      const colorDiff = Math.abs(avgR - bgR) + Math.abs(avgG - bgG) + Math.abs(avgB - bgB);
      if (colorDiff < 15) {
        // Pixel is background color, render as space
        rowCells.push({ char: ' ', r: avgR | 0, g: avgG | 0, b: avgB | 0, brightness: 0 });
        continue;
      }

      let brightness = getLuminance(avgR, avgG, avgB);

      // Gamma correction
      if (logGamma !== 1.0 && brightness > 0) {
        brightness = Math.pow(brightness, logGamma);
      }

      // Contrast
      if (contrast !== 1) {
        brightness = Math.max(0, Math.min(1, (brightness - 0.5) * contrast + 0.5));
      }

      // Invert
      if (invert) {
        brightness = 1 - brightness;
      }

      // Map brightness to character
      const charIndex = brightness * (charsLen - 1) | 0;
      const char = chars[charIndex];

      rowCells.push({
        char,
        r: avgR | 0,
        g: avgG | 0,
        b: avgB | 0,
        brightness,
      });
    }
    cells.push(rowCells);
  }

  return { cells, cols, rows };
}

/**
 * Parse hex color to RGB with caching
 */
function hexToRGB(hex: string): [number, number, number] {
  // Check cache first
  const cached = hexToRGBCache.get(hex);
  if (cached) return cached;

  const h = hex.replace('#', '');
  const result: [number, number, number] = [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];

  // Store in cache (max 32 colors)
  if (hexToRGBCache.size < 32) hexToRGBCache.set(hex, result);

  return result;
}

/**
 * Boost color saturation and brightness for ASCII display
 * Optimized with inline calculations
 */
function boostColor(r: number, g: number, b: number, brightness: number, brightnessBoost: number = 1.0): [number, number, number] {
  const max = r > g ? (r > b ? r : b) : (g > b ? g : b);
  const boost = Math.min(255 / (max || 1), 3);
  const mul = 0.3 + brightness * 1.6 * brightnessBoost;
  return [
    Math.min(255, (r * boost * mul) | 0),
    Math.min(255, (g * boost * mul) | 0),
    Math.min(255, (b * boost * mul) | 0),
  ];
}

// Font cache to avoid repeated allocation
let cachedFont = '';

/**
 * Renders ASCII frame data onto a 2D canvas (Optimized).
 * This completely replaces the 3D view — no overlay or blending.
 */
export function renderASCIIToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: ASCIIFrameData,
  canvasWidth: number,
  canvasHeight: number,
  options: ASCIIRenderOptions & {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    textOpacity?: number;
    backgroundOpacity?: number;
    brightnessBoost?: number;
  }
): void {
  const {
    colorMode = true,
    textColor = '#00ff00',
    backgroundColor = '#000000',
    textOpacity = 1,
    backgroundOpacity = 1,
    fontSize,
    fontWeight = 'bold',
    brightnessBoost = 1.0,
  } = options;

  if (frame.rows === 0 || frame.cols === 0) return;

  const [bgR, bgG, bgB] = hexToRGB(backgroundColor);

  // Fill background
  ctx.fillStyle = `rgba(${bgR | 0}, ${bgG | 0}, ${bgB | 0}, ${backgroundOpacity})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate cell dimensions to fill the entire canvas
  const cellW = canvasWidth / frame.cols;
  const cellH = canvasHeight / frame.rows;

  // Use provided fontSize or auto-calculate
  let actualFontSize: number;
  if (fontSize && fontSize > 0) {
    actualFontSize = fontSize;
  } else {
    // Pick font size that fits cells snugly
    const fitFontSize = Math.min(cellH * 1.1, cellW * 1.8);
    actualFontSize = Math.max(4, fitFontSize) | 0;
  }

  // Only set font if it changed (avoid unnecessary style changes)
  const fontStr = `${fontWeight} ${actualFontSize}px "Courier New", Consolas, monospace`;
  if (cachedFont !== fontStr) {
    cachedFont = fontStr;
    ctx.font = fontStr;
  }

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.imageSmoothingEnabled = false;

  const [monoR, monoG, monoB] = hexToRGB(textColor);
  const cellWHalf = cellW / 2;
  const cellHHalf = cellH / 2;

  // Batch render: collect styles before rendering
  for (let row = 0; row < frame.rows; row++) {
    const y = row * cellH + cellHHalf;
    const rowData = frame.cells[row];

    for (let col = 0; col < frame.cols; col++) {
      const cell = rowData[col];
      if (cell.char === ' ') continue;

      const x = col * cellW + cellWHalf;

      if (colorMode) {
        const [cr, cg, cb] = boostColor(cell.r, cell.g, cell.b, cell.brightness, brightnessBoost);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${textOpacity})`;
      } else {
        const b = Math.min(1, cell.brightness + 0.15);
        const intensity = b * textOpacity;
        ctx.fillStyle = `rgba(${(monoR * b) | 0}, ${(monoG * b) | 0}, ${(monoB * b) | 0}, ${intensity})`;
      }

      ctx.fillText(cell.char, x, y);
    }
  }
}
