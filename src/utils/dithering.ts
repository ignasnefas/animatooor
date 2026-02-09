/**
 * Dithering algorithms for retro visual effects
 */

export type DitheringType = 'none' | 'bayer' | 'floydSteinberg' | 'jjn' | 'stucki' | 'sierra' | 'ordered';

/**
 * Bayer matrix for ordered dithering
 */
const bayerMatrix8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Apply Bayer ordered dithering to image data
 */
export function applyBayerDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  // If resolution is < 1, process at lower resolution and upscale
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'bayer');
    return;
  }

  const matrix = bayerMatrix8x8;
  const matrixSize = 8;
  const ditherScale = 255 * intensity / 64;

  // Single pass with optimized math
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const mx = x & 7; // Bitwise AND faster than modulo
    const my = y & 7;
    const dither = (matrix[my][mx] - 32) * ditherScale;

    data[i] = Math.max(0, Math.min(255, data[i] + dither)) | 0;
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + dither)) | 0;
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + dither)) | 0;

    // Use cached color lookup
    const [pr, pg, pb] = findNearestColor(data[i], data[i + 1], data[i + 2], palette);
    data[i] = pr;
    data[i + 1] = pg;
    data[i + 2] = pb;
  }
}

/**
 * Apply Floyd-Steinberg dithering (diffusion-based)
 * Optimized with reduced allocations and fixed error distribution
 */
export function applyFloydSteinbergDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  // If resolution is < 1, process at lower resolution and upscale
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'floydSteinberg');
    return;
  }

  // Create error buffers for current and next row (RGB channels)
  const errorBuffer = new Float32Array((width + 2) * 3 * 2);
  let currentRow = 0;

  for (let y = 0; y < height; y++) {
    const nextRow = 1 - currentRow;
    
    // Clear next row buffer at start
    const nextBufStart = nextRow * (width + 2) * 3;
    for (let i = 0; i < (width + 2) * 3; i++) {
      errorBuffer[nextBufStart + i] = 0;
    }

    const currentBufStart = currentRow * (width + 2) * 3;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const errIdx = currentBufStart + (x + 1) * 3; // +1 for border pixel

      // Apply accumulated error
      let r = Math.max(0, Math.min(255, data[idx] + errorBuffer[errIdx] * intensity));
      let g = Math.max(0, Math.min(255, data[idx + 1] + errorBuffer[errIdx + 1] * intensity));
      let b = Math.max(0, Math.min(255, data[idx + 2] + errorBuffer[errIdx + 2] * intensity));

      // Find nearest palette color
      const [pr, pg, pb] = findNearestColor(r | 0, g | 0, b | 0, palette);

      // Calculate error (quantization error)
      const errR = (r - pr) / 16;
      const errG = (g - pg) / 16;
      const errB = (b - pb) / 16;

      // Set pixel to palette color
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;

      // Distribute error using Floyd-Steinberg kernel:
      //       X   7/16
      // 3/16  5/16  1/16
      const nextBufStart_row = nextRow * (width + 2) * 3;
      
      // Right (7/16) - current row
      if (x < width - 1) {
        errorBuffer[errIdx + 3] += errR * 7;
        errorBuffer[errIdx + 4] += errG * 7;
        errorBuffer[errIdx + 5] += errB * 7;
      }
      
      // Below-left (3/16) - next row
      if (y < height - 1) {
        const belowLeftIdx = nextBufStart_row + x * 3;
        errorBuffer[belowLeftIdx] += errR * 3;
        errorBuffer[belowLeftIdx + 1] += errG * 3;
        errorBuffer[belowLeftIdx + 2] += errB * 3;
      }
      
      // Below (5/16) - next row
      if (y < height - 1) {
        const belowIdx = nextBufStart_row + (x + 1) * 3;
        errorBuffer[belowIdx] += errR * 5;
        errorBuffer[belowIdx + 1] += errG * 5;
        errorBuffer[belowIdx + 2] += errB * 5;
      }
      
      // Below-right (1/16) - next row
      if (y < height - 1 && x < width - 1) {
        const belowRightIdx = nextBufStart_row + (x + 2) * 3;
        errorBuffer[belowRightIdx] += errR;
        errorBuffer[belowRightIdx + 1] += errG;
        errorBuffer[belowRightIdx + 2] += errB;
      }
    }
    
    currentRow = nextRow;
  }
}

/**
 * Apply Jarvis-Judson-Ninke dithering (7x7 kernel, higher quality)
 * More diffusion than Floyd-Steinberg, produces smoother results
 */
export function applyJJNDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'jjn');
    return;
  }

  // Allocate error buffer for 3 rows (current + 2 next rows for 7x7 kernel)
  const errorBuffer = new Float32Array((width + 6) * 3 * 3);
  let currentRow = 0;

  for (let y = 0; y < height; y++) {
    const nextRow = (currentRow + 1) % 3;
    const nextNextRow = (currentRow + 2) % 3;

    // Clear future rows
    for (let i = nextRow * (width + 6) * 3; i < (nextRow + 1) * (width + 6) * 3; i++) {
      errorBuffer[i] = 0;
    }
    for (let i = nextNextRow * (width + 6) * 3; i < (nextNextRow + 1) * (width + 6) * 3; i++) {
      errorBuffer[i] = 0;
    }

    const currentBufStart = currentRow * (width + 6) * 3;
    const nextBufStart = nextRow * (width + 6) * 3;
    const nextNextBufStart = nextNextRow * (width + 6) * 3;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const errIdx = currentBufStart + (x + 3) * 3; // +3 for 3-pixel border

      // Apply accumulated error
      let r = Math.max(0, Math.min(255, data[idx] + errorBuffer[errIdx] * intensity));
      let g = Math.max(0, Math.min(255, data[idx + 1] + errorBuffer[errIdx + 1] * intensity));
      let b = Math.max(0, Math.min(255, data[idx + 2] + errorBuffer[errIdx + 2] * intensity));

      const [pr, pg, pb] = findNearestColor(r | 0, g | 0, b | 0, palette);

      const errR = (r - pr) / 48;
      const errG = (g - pg) / 48;
      const errB = (b - pb) / 48;

      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;

      // JJN kernel (48-normalized):
      //          X  7  5
      //      3  5  7  5  3
      //      1  3  5  3  1
      if (x < width - 1) {
        errorBuffer[errIdx + 3] += errR * 7;
        errorBuffer[errIdx + 4] += errG * 7;
        errorBuffer[errIdx + 5] += errB * 7;
      }
      if (x < width - 2) {
        errorBuffer[errIdx + 6] += errR * 5;
        errorBuffer[errIdx + 7] += errG * 5;
        errorBuffer[errIdx + 8] += errB * 5;
      }

      if (y < height - 1) {
        if (x > 0) {
          errorBuffer[nextBufStart + (x + 2) * 3] += errR * 3;
          errorBuffer[nextBufStart + (x + 2) * 3 + 1] += errG * 3;
          errorBuffer[nextBufStart + (x + 2) * 3 + 2] += errB * 3;
        }
        errorBuffer[nextBufStart + (x + 3) * 3] += errR * 5;
        errorBuffer[nextBufStart + (x + 3) * 3 + 1] += errG * 5;
        errorBuffer[nextBufStart + (x + 3) * 3 + 2] += errB * 5;
        if (x < width - 1) {
          errorBuffer[nextBufStart + (x + 4) * 3] += errR * 7;
          errorBuffer[nextBufStart + (x + 4) * 3 + 1] += errG * 7;
          errorBuffer[nextBufStart + (x + 4) * 3 + 2] += errB * 7;
        }
        if (x < width - 2) {
          errorBuffer[nextBufStart + (x + 5) * 3] += errR * 5;
          errorBuffer[nextBufStart + (x + 5) * 3 + 1] += errG * 5;
          errorBuffer[nextBufStart + (x + 5) * 3 + 2] += errB * 5;
        }
        if (x > 0) {
          errorBuffer[nextBufStart + (x + 1) * 3] += errR * 3;
          errorBuffer[nextBufStart + (x + 1) * 3 + 1] += errG * 3;
          errorBuffer[nextBufStart + (x + 1) * 3 + 2] += errB * 3;
        }
      }

      if (y < height - 2) {
        if (x > 0) {
          errorBuffer[nextNextBufStart + (x + 2) * 3] += errR;
          errorBuffer[nextNextBufStart + (x + 2) * 3 + 1] += errG;
          errorBuffer[nextNextBufStart + (x + 2) * 3 + 2] += errB;
        }
        errorBuffer[nextNextBufStart + (x + 3) * 3] += errR * 3;
        errorBuffer[nextNextBufStart + (x + 3) * 3 + 1] += errG * 3;
        errorBuffer[nextNextBufStart + (x + 3) * 3 + 2] += errB * 3;
        if (x < width - 1) {
          errorBuffer[nextNextBufStart + (x + 4) * 3] += errR * 5;
          errorBuffer[nextNextBufStart + (x + 4) * 3 + 1] += errG * 5;
          errorBuffer[nextNextBufStart + (x + 4) * 3 + 2] += errB * 5;
        }
        if (x < width - 2) {
          errorBuffer[nextNextBufStart + (x + 5) * 3] += errR * 3;
          errorBuffer[nextNextBufStart + (x + 5) * 3 + 1] += errG * 3;
          errorBuffer[nextNextBufStart + (x + 5) * 3 + 2] += errB * 3;
        }
        if (x > 0) {
          errorBuffer[nextNextBufStart + (x + 1) * 3] += errR;
          errorBuffer[nextNextBufStart + (x + 1) * 3 + 1] += errG;
          errorBuffer[nextNextBufStart + (x + 1) * 3 + 2] += errB;
        }
      }
    }

    currentRow = nextRow;
  }
}

/**
 * Apply Stucki dithering (5x5 kernel)
 * Similar quality to JJN but with slightly different distribution
 */
export function applyStuckiDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'stucki');
    return;
  }

  const errorBuffer = new Float32Array((width + 4) * 3 * 2);
  let currentRow = 0;

  for (let y = 0; y < height; y++) {
    const nextRow = 1 - currentRow;

    for (let i = nextRow * (width + 4) * 3; i < (nextRow + 1) * (width + 4) * 3; i++) {
      errorBuffer[i] = 0;
    }

    const currentBufStart = currentRow * (width + 4) * 3;
    const nextBufStart = nextRow * (width + 4) * 3;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const errIdx = currentBufStart + (x + 2) * 3;

      let r = Math.max(0, Math.min(255, data[idx] + errorBuffer[errIdx] * intensity));
      let g = Math.max(0, Math.min(255, data[idx + 1] + errorBuffer[errIdx + 1] * intensity));
      let b = Math.max(0, Math.min(255, data[idx + 2] + errorBuffer[errIdx + 2] * intensity));

      const [pr, pg, pb] = findNearestColor(r | 0, g | 0, b | 0, palette);

      const errR = (r - pr) / 42;
      const errG = (g - pg) / 42;
      const errB = (b - pb) / 42;

      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;

      // Stucki kernel (42-normalized):
      //        X  8  4
      //     2  4  8  4  2
      if (x < width - 1) {
        errorBuffer[errIdx + 3] += errR * 8;
        errorBuffer[errIdx + 4] += errG * 8;
        errorBuffer[errIdx + 5] += errB * 8;
      }
      if (x < width - 2) {
        errorBuffer[errIdx + 6] += errR * 4;
        errorBuffer[errIdx + 7] += errG * 4;
        errorBuffer[errIdx + 8] += errB * 4;
      }

      if (y < height - 1) {
        if (x > 0) {
          errorBuffer[nextBufStart + (x + 1) * 3] += errR * 2;
          errorBuffer[nextBufStart + (x + 1) * 3 + 1] += errG * 2;
          errorBuffer[nextBufStart + (x + 1) * 3 + 2] += errB * 2;
        }
        errorBuffer[nextBufStart + (x + 2) * 3] += errR * 4;
        errorBuffer[nextBufStart + (x + 2) * 3 + 1] += errG * 4;
        errorBuffer[nextBufStart + (x + 2) * 3 + 2] += errB * 4;
        if (x < width - 1) {
          errorBuffer[nextBufStart + (x + 3) * 3] += errR * 8;
          errorBuffer[nextBufStart + (x + 3) * 3 + 1] += errG * 8;
          errorBuffer[nextBufStart + (x + 3) * 3 + 2] += errB * 8;
        }
        if (x < width - 2) {
          errorBuffer[nextBufStart + (x + 4) * 3] += errR * 4;
          errorBuffer[nextBufStart + (x + 4) * 3 + 1] += errG * 4;
          errorBuffer[nextBufStart + (x + 4) * 3 + 2] += errB * 4;
        }
        if (x < width - 3) {
          errorBuffer[nextBufStart + (x + 5) * 3] += errR * 2;
          errorBuffer[nextBufStart + (x + 5) * 3 + 1] += errG * 2;
          errorBuffer[nextBufStart + (x + 5) * 3 + 2] += errB * 2;
        }
      }
    }

    currentRow = nextRow;
  }
}

/**
 * Apply Sierra dithering (3-pass variant, 5x5 kernel)
 * Good balance between quality and speed
 */
export function applySierraDithering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number = 1.0,
  resolution: number = 1.0
): void {
  if (resolution < 1) {
    applyDitheringAtLowerResolution(data, width, height, palette, intensity, resolution, 'sierra');
    return;
  }

  const errorBuffer = new Float32Array((width + 4) * 3 * 2);
  let currentRow = 0;

  for (let y = 0; y < height; y++) {
    const nextRow = 1 - currentRow;

    for (let i = nextRow * (width + 4) * 3; i < (nextRow + 1) * (width + 4) * 3; i++) {
      errorBuffer[i] = 0;
    }

    const currentBufStart = currentRow * (width + 4) * 3;
    const nextBufStart = nextRow * (width + 4) * 3;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const errIdx = currentBufStart + (x + 2) * 3;

      let r = Math.max(0, Math.min(255, data[idx] + errorBuffer[errIdx] * intensity));
      let g = Math.max(0, Math.min(255, data[idx + 1] + errorBuffer[errIdx + 1] * intensity));
      let b = Math.max(0, Math.min(255, data[idx + 2] + errorBuffer[errIdx + 2] * intensity));

      const [pr, pg, pb] = findNearestColor(r | 0, g | 0, b | 0, palette);

      const errR = (r - pr) / 32;
      const errG = (g - pg) / 32;
      const errB = (b - pb) / 32;

      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;

      // Sierra kernel (32-normalized):
      //       X  5  3
      //     2  4  5  4  2
      if (x < width - 1) {
        errorBuffer[errIdx + 3] += errR * 5;
        errorBuffer[errIdx + 4] += errG * 5;
        errorBuffer[errIdx + 5] += errB * 5;
      }
      if (x < width - 2) {
        errorBuffer[errIdx + 6] += errR * 3;
        errorBuffer[errIdx + 7] += errG * 3;
        errorBuffer[errIdx + 8] += errB * 3;
      }

      if (y < height - 1) {
        if (x > 0) {
          errorBuffer[nextBufStart + (x + 1) * 3] += errR * 2;
          errorBuffer[nextBufStart + (x + 1) * 3 + 1] += errG * 2;
          errorBuffer[nextBufStart + (x + 1) * 3 + 2] += errB * 2;
        }
        errorBuffer[nextBufStart + (x + 2) * 3] += errR * 4;
        errorBuffer[nextBufStart + (x + 2) * 3 + 1] += errG * 4;
        errorBuffer[nextBufStart + (x + 2) * 3 + 2] += errB * 4;
        if (x < width - 1) {
          errorBuffer[nextBufStart + (x + 3) * 3] += errR * 5;
          errorBuffer[nextBufStart + (x + 3) * 3 + 1] += errG * 5;
          errorBuffer[nextBufStart + (x + 3) * 3 + 2] += errB * 5;
        }
        if (x < width - 2) {
          errorBuffer[nextBufStart + (x + 4) * 3] += errR * 4;
          errorBuffer[nextBufStart + (x + 4) * 3 + 1] += errG * 4;
          errorBuffer[nextBufStart + (x + 4) * 3 + 2] += errB * 4;
        }
        if (x < width - 3) {
          errorBuffer[nextBufStart + (x + 5) * 3] += errR * 2;
          errorBuffer[nextBufStart + (x + 5) * 3 + 1] += errG * 2;
          errorBuffer[nextBufStart + (x + 5) * 3 + 2] += errB * 2;
        }
      }
    }

    currentRow = nextRow;
  }
}
function applyDitheringAtLowerResolution(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  palette: [number, number, number][],
  intensity: number,
  resolution: number,
  type: 'bayer' | 'floydSteinberg' | 'jjn' | 'stucki' | 'sierra'
): void {
  // Calculate lower resolution dimensions
  const scaledWidth = Math.max(2, Math.floor(width * resolution));
  const scaledHeight = Math.max(2, Math.floor(height * resolution));
  const scaleX = width / scaledWidth;
  const scaleY = height / scaledHeight;

  // Create downscaled image data
  const scaledData = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);
  
  // Downscale by averaging
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      
      const x0 = Math.floor(x * scaleX);
      const y0 = Math.floor(y * scaleY);
      const x1 = Math.floor((x + 1) * scaleX);
      const y1 = Math.floor((y + 1) * scaleY);
      
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const idx = (py * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }
      
      const scaledIdx = (y * scaledWidth + x) * 4;
      scaledData[scaledIdx] = r / count;
      scaledData[scaledIdx + 1] = g / count;
      scaledData[scaledIdx + 2] = b / count;
      scaledData[scaledIdx + 3] = a / count;
    }
  }

  // Apply dithering to scaled data
  if (type === 'bayer') {
    applyBayerDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  } else if (type === 'floydSteinberg') {
    applyFloydSteinbergDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  } else if (type === 'jjn') {
    applyJJNDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  } else if (type === 'stucki') {
    applyStuckiDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  } else if (type === 'sierra') {
    applySierraDithering(scaledData, scaledWidth, scaledHeight, palette, intensity, 1.0);
  }

  // Upscale back to original resolution using nearest-neighbor
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor(x / scaleX);
      const srcY = Math.floor(y / scaleY);
      const srcIdx = (srcY * scaledWidth + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      
      data[dstIdx] = scaledData[srcIdx];
      data[dstIdx + 1] = scaledData[srcIdx + 1];
      data[dstIdx + 2] = scaledData[srcIdx + 2];
      data[dstIdx + 3] = scaledData[srcIdx + 3];
    }
  }
}

// Cache for nearest color lookups - LRU cache for frequently used colors
const colorCache = new Map<number, [number, number, number]>();
const MAX_CACHE_SIZE = 8192;

/**
 * Find the nearest color in a palette using Euclidean distance with caching
 */
function findNearestColor(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  // Create cache key from RGB values
  const key = (r << 16) | (g << 8) | b;
  
  // Check cache first (huge performance boost)
  if (colorCache.has(key)) {
    return colorCache.get(key)!;
  }

  let minDist = Infinity;
  let nearest = palette[0];

  // Hardcoded palette optimization - cache precomputed squared values
  for (const [pr, pg, pb] of palette) {
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr + dg * dg + db * db;
    
    if (dist < minDist) {
      minDist = dist;
      nearest = [pr, pg, pb];
    }
  }

  // Store in cache with LRU eviction
  if (colorCache.size >= MAX_CACHE_SIZE) {
    const firstKey = colorCache.keys().next().value;
    if (firstKey !== undefined) colorCache.delete(firstKey);
  }
  colorCache.set(key, nearest);

  return nearest;
}

/**
 * Reduce colors to nearest palette colors without dithering
 * Optimized with cached color lookups
 */
export function reduceColorsTopalette(
  data: Uint8ClampedArray,
  palette: [number, number, number][]
): void {
  // Clear cache at start of frame for consistency
  colorCache.clear();
  
  // Process in chunks for better cache locality
  const chunkSize = Math.min(64, data.length / 4);
  
  for (let i = 0; i < data.length; i += 4 * chunkSize) {
    for (let j = 0; j < chunkSize && i + j * 4 < data.length; j++) {
      const idx = i + j * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const [pr, pg, pb] = findNearestColor(r, g, b, palette);
      data[idx] = pr;
      data[idx + 1] = pg;
      data[idx + 2] = pb;
    }
  }
}
