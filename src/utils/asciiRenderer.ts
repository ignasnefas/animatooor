/**
 * ASCII Art Renderer
 * Converts canvas content to a full ASCII art replacement.
 * Renders colored ASCII characters that completely replace the 3D scene.
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

/**
 * Gets perceived brightness from RGB values (0-1)
 * Uses ITU-R BT.709 luminance coefficients
 */
function getLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Converts canvas ImageData into a grid of ASCII cells with color info.
 * Samples blocks of pixels and maps each block to a character based on average brightness.
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
  } = options;

  const chars = charsets[charset] || charsets.standard;
  const cols = resolution;
  // Character cells are roughly 2x taller than wide in monospace fonts
  const cellWidth = width / cols;
  const cellHeight = cellWidth * 2;
  const rows = Math.floor(height / cellHeight);

  const data = imageData.data;
  const cells: ASCIICellData[][] = [];

  for (let row = 0; row < rows; row++) {
    const rowCells: ASCIICellData[] = [];
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * cellWidth);
      const y0 = Math.floor(row * cellHeight);
      const x1 = Math.min(Math.floor((col + 1) * cellWidth), width);
      const y1 = Math.min(Math.floor((row + 1) * cellHeight), height);

      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
      let sampleCount = 0;

      // Sample every Nth pixel for performance
      const stepX = Math.max(1, Math.floor((x1 - x0) / 4));
      const stepY = Math.max(1, Math.floor((y1 - y0) / 4));

      for (let py = y0; py < y1; py += stepY) {
        for (let px = x0; px < x1; px += stepX) {
          const idx = (py * width + px) * 4;
          totalR += data[idx];
          totalG += data[idx + 1];
          totalB += data[idx + 2];
          totalA += data[idx + 3];
          sampleCount++;
        }
      }

      if (sampleCount === 0) {
        rowCells.push({ char: chars[0], r: 0, g: 0, b: 0, brightness: 0 });
        continue;
      }

      const avgR = totalR / sampleCount;
      const avgG = totalG / sampleCount;
      const avgB = totalB / sampleCount;
      const avgA = totalA / sampleCount;

      let brightness = (avgA / 255) * getLuminance(avgR, avgG, avgB);

      // Gamma correction
      if (gamma !== 1.0) {
        brightness = Math.pow(Math.max(0, brightness), 1.0 / gamma);
      }

      // Contrast
      if (contrast !== 1) {
        brightness = Math.max(0, Math.min(1, (brightness - 0.5) * contrast + 0.5));
      }

      // Invert
      if (invert) {
        brightness = 1 - brightness;
      }

      const charIndex = Math.floor(brightness * (chars.length - 1));
      const char = chars[Math.max(0, Math.min(charIndex, chars.length - 1))];

      rowCells.push({
        char,
        r: Math.round(avgR),
        g: Math.round(avgG),
        b: Math.round(avgB),
        brightness,
      });
    }
    cells.push(rowCells);
  }

  return { cells, cols, rows };
}

/**
 * Parse hex color to RGB
 */
function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
}

/**
 * Boost color saturation and brightness for ASCII display
 */
function boostColor(r: number, g: number, b: number, brightness: number, brightnessBoost: number = 1.0): [number, number, number] {
  const maxC = Math.max(r, g, b, 1);
  const boost = Math.min(255 / maxC, 3.0);
  const brightnessMultiplier = 0.3 + brightness * 1.6 * brightnessBoost;
  return [
    Math.min(255, Math.round(r * boost * brightnessMultiplier)),
    Math.min(255, Math.round(g * boost * brightnessMultiplier)),
    Math.min(255, Math.round(b * boost * brightnessMultiplier)),
  ];
}

/**
 * Renders ASCII frame data onto a 2D canvas.
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

  const [bgR, bgG, bgB] = hexToRGB(backgroundColor);

  // Fill background
  ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, ${backgroundOpacity})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (frame.rows === 0 || frame.cols === 0) return;

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
    actualFontSize = Math.max(4, fitFontSize);
  }

  ctx.font = `${fontWeight} ${actualFontSize}px "Courier New", "Consolas", monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const [monoR, monoG, monoB] = hexToRGB(textColor);

  for (let row = 0; row < frame.rows; row++) {
    const y = row * cellH + cellH / 2;
    for (let col = 0; col < frame.cols; col++) {
      const cell = frame.cells[row][col];
      if (cell.char === ' ') continue;

      const x = col * cellW + cellW / 2;

      if (colorMode) {
        const [cr, cg, cb] = boostColor(cell.r, cell.g, cell.b, cell.brightness, brightnessBoost);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${textOpacity})`;
      } else {
        const b = Math.min(1, cell.brightness + 0.15);
        ctx.fillStyle = `rgba(${Math.round(monoR * b)}, ${Math.round(monoG * b)}, ${Math.round(monoB * b)}, ${textOpacity})`;
      }

      ctx.fillText(cell.char, x, y);
    }
  }
}
