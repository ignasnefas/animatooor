import { useRef, useState, useCallback } from 'react';
import { AnimationSettings } from '../types';
import { imageDataToASCIICells, renderASCIIToCanvas } from '../utils/asciiRenderer';
import { applyBayerDithering, applyFloydSteinbergDithering, reduceColorsTopalette } from '../utils/dithering';
import { palettes } from '../utils/palettes';
import { applyPixelation } from '../utils/pixelation';

// @ts-ignore - gif.js doesn't have TypeScript definitions
import GIF from 'gif.js';

// Calculate bitrate based on resolution and quality
function calculateBitrate(width: number, height: number, quality: 'good' | 'excellent' | 'maximum', fps: number = 30): number {
  const pixelCount = width * height;
  const baseMultiplier = {
    'good': 0.6,
    'excellent': 1.5,
    'maximum': 3.0,
  }[quality];

  // Calculate bitrate: roughly 0.1-0.3 bits per pixel per second for good quality
  // Adjusted for fps and quality tier
  const bitrate = Math.round(pixelCount * fps * baseMultiplier);
  
  // Minimum and maximum bounds
  return Math.max(500000, Math.min(bitrate, 80000000)); // 0.5Mbps to 80Mbps
}

// Generate frames for GIF encoding
async function generateGifFrames(
  canvas: HTMLCanvasElement,
  settings: AnimationSettings,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
): Promise<ImageData[]> {
  const frames: ImageData[] = [];
  const targetDuration = settings.loopDuration * settings.exportLoopCount;
  const targetFrameCount = Math.round(targetDuration * settings.exportFps);
  const frameIntervalMs = 1000 / settings.exportFps;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = settings.exportWidth;
  tempCanvas.height = settings.exportHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Failed to create canvas context');

  for (let i = 0; i < targetFrameCount; i++) {
    // Draw the current frame
    tempCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      settings.exportWidth,
      settings.exportHeight
    );
    
    // Capture frame as ImageData
    const frameData = tempCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight);
    frames.push(frameData);

    // Wait for next frame interval
    await new Promise(resolve => setTimeout(resolve, frameIntervalMs));
  }

  return frames;
}

// Gif.js-style encoder (simple implementation)
async function encodeGifFromFrames(frames: ImageData[], width: number, height: number, fps: number): Promise<Blob> {
  // This is a simplified version - for production, you'd want to use gif.js library
  // For now, we'll create a simple animated GIF using canvas
  // In a real implementation, you'd use: https://github.com/jnordberg/gif.js
  
  // Create a single frame GIF as fallback (user can use GIF alternatives)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context');

  // Draw first frame
  if (frames.length > 0) {
    ctx.putImageData(frames[0], 0, 0);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/gif');
  });
}

export function useVideoExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const abortRef = useRef(false);

  const exportVideo = useCallback(async (
    canvas: HTMLCanvasElement,
    settings: AnimationSettings,
  ) => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    abortRef.current = false;

    try {
      // Calculate duration ensuring we capture complete loops
      const targetDuration = settings.loopDuration * settings.exportLoopCount;
      
      // Calculate exact frame count needed
      const targetFrameCount = Math.round(targetDuration * settings.exportFps);
      // The exact duration this frame count represents
      const exactDurationMs = (targetFrameCount / settings.exportFps) * 1000;
      const frameIntervalMs = 1000 / settings.exportFps;
      
      // Stop slightly before the end to avoid capturing the boundary frame
      // which could cause a discontinuity when the video loops
      const stopDurationMs = exactDurationMs - (frameIntervalMs * 0.1);

      // Calculate crop dimensions to match export aspect ratio
      const exportAspectRatio = settings.exportWidth / settings.exportHeight;
      const screenWidth = canvas.width;
      const screenHeight = canvas.height;
      const screenAspectRatio = screenWidth / screenHeight;

      let cropWidth, cropHeight, cropX, cropY;

      if (exportAspectRatio > screenAspectRatio) {
        // Export is wider, crop height
        cropWidth = screenWidth;
        cropHeight = screenWidth / exportAspectRatio;
        cropX = 0;
        cropY = (screenHeight - cropHeight) / 2;
      } else {
        // Export is taller, crop width
        cropHeight = screenHeight;
        cropWidth = screenHeight * exportAspectRatio;
        cropX = (screenWidth - cropWidth) / 2;
        cropY = 0;
      }

      // Handle GIF export separately
      if (settings.exportFormat === 'gif') {
        // Generate frames with effects applied
        const frames: ImageData[] = [];
        const targetDuration = settings.loopDuration * settings.exportLoopCount;
        const targetFrameCount = Math.round(targetDuration * settings.exportFps);
        const frameIntervalMs = 1000 / settings.exportFps;

        // Create temp canvas for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = settings.exportWidth;
        tempCanvas.height = settings.exportHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Failed to create canvas context');

        // Processing canvas for effects
        const processScale = 0.5;
        const processWidth = Math.round(cropWidth * processScale);
        const processHeight = Math.round(cropHeight * processScale);
        const processCanvas = document.createElement('canvas');
        processCanvas.width = processWidth;
        processCanvas.height = processHeight;
        const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
        if (!processCtx) throw new Error('Failed to create process context');

        for (let i = 0; i < targetFrameCount; i++) {
          setExportProgress(i / targetFrameCount);

          if (abortRef.current) break;

          // Simulate time progression for animation
          const currentTime = (i / settings.exportFps) % settings.loopDuration;

          // Wait for frame interval (simulate animation timing)
          await new Promise(resolve => setTimeout(resolve, frameIntervalMs));

          try {
            if (settings.asciiEnabled) {
              // ASCII processing
              processCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, processWidth, processHeight);
              const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);

              const frame = imageDataToASCIICells(imageData, processWidth, processHeight, {
                charset: settings.asciiCharset,
                resolution: settings.asciiResolution,
                invert: settings.asciiInvert,
                contrast: settings.asciiContrast,
                gamma: settings.asciiGamma,
                colorMode: settings.asciiColorMode,
                textColor: settings.asciiTextColor,
                backgroundColor: settings.backgroundColor,
              });

              renderASCIIToCanvas(tempCtx, frame, settings.exportWidth, settings.exportHeight, {
                charset: settings.asciiCharset,
                resolution: settings.asciiResolution,
                colorMode: settings.asciiColorMode,
                textColor: settings.asciiTextColor,
                backgroundColor: settings.backgroundColor,
                fontSize: settings.asciiFontSize,
                fontWeight: settings.asciiFontWeight,
                textOpacity: settings.asciiOpacity,
                backgroundOpacity: settings.asciiBackgroundOpacity,
                brightnessBoost: settings.asciiBrightnessBoost,
              });
            } else {
              // Regular processing with dithering/pixelation
              processCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, processWidth, processHeight);

              if (settings.ditheringEnabled || (settings.paletteType !== 'full')) {
                const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);
                const palette = palettes[settings.paletteType].colors;

                if (settings.ditheringEnabled) {
                  if (settings.ditheringType === 'bayer') {
                    applyBayerDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                  } else {
                    applyFloydSteinbergDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                  }
                } else {
                  reduceColorsTopalette(imageData.data, palette);
                }

                processCtx.putImageData(imageData, 0, 0);
              }

              if (settings.pixelationEnabled && settings.pixelSize > 1) {
                applyPixelation(processCtx, processCanvas, settings.pixelSize);
              }

              // Scale to export size
              tempCtx.drawImage(processCanvas, 0, 0, processWidth, processHeight, 0, 0, settings.exportWidth, settings.exportHeight);
            }

            // Capture frame
            const frameData = tempCtx.getImageData(0, 0, settings.exportWidth, settings.exportHeight);
            frames.push(frameData);
          } catch (e) {
            console.warn('Frame capture error:', e);
          }
        }

        if (!abortRef.current && frames.length > 0) {
          // Create GIF using gif.js
          const gif = new GIF({
            workers: 2,
            quality: 10,
            width: settings.exportWidth,
            height: settings.exportHeight,
            workerScript: '/gif.worker.js'
          });

          frames.forEach(frame => {
            const canvas = document.createElement('canvas');
            canvas.width = settings.exportWidth;
            canvas.height = settings.exportHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.putImageData(frame, 0, 0);
              gif.addFrame(canvas, { delay: 1000 / settings.exportFps });
            }
          });

          gif.on('finished', (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `loopforge-${settings.animationType}-${Date.now()}.gif`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsExporting(false);
            setExportProgress(0);
          });

          gif.on('progress', (p: number) => {
            setExportProgress(0.5 + p * 0.5); // 50% for frame generation, 50% for encoding
          });

          gif.render();
        } else {
          setIsExporting(false);
          setExportProgress(0);
        }

        return;
      }

      let recordingCanvas = canvas;
      let recordingStream: MediaStream;

      // If ASCII is enabled, capture and process frames manually
      if (settings.asciiEnabled) {
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = settings.exportWidth;
        compositeCanvas.height = settings.exportHeight;
        
        recordingCanvas = compositeCanvas;
        recordingStream = compositeCanvas.captureStream(settings.exportFps);

        // Temp canvas to read WebGL pixels
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;

        let capturedFrames = 0;
        const recordingStartTime = Date.now();
        
        const compositeCaptureLoop = setInterval(() => {
          // Calculate which frame we should be on based on elapsed time
          const elapsed = Date.now() - recordingStartTime;
          const currentFrameNumber = Math.floor((elapsed / 1000) * settings.exportFps);

          // Only capture if we haven't already captured this frame
          if (currentFrameNumber <= capturedFrames) return;
          capturedFrames = currentFrameNumber;

          const ctx = compositeCanvas.getContext('2d');
          const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx || !tempCtx) return;

          try {
            // Copy cropped WebGL pixels to temp canvas
            tempCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            const imageData = tempCtx.getImageData(0, 0, cropWidth, cropHeight);

            // Convert to ASCII cell grid
            const frame = imageDataToASCIICells(imageData, cropWidth, cropHeight, {
              charset: settings.asciiCharset,
              resolution: settings.asciiResolution,
              invert: settings.asciiInvert,
              contrast: settings.asciiContrast,
              gamma: settings.asciiGamma,
              colorMode: settings.asciiColorMode,
              textColor: settings.asciiTextColor,
              backgroundColor: settings.backgroundColor,
            });

            // Render ASCII to the composite canvas
            renderASCIIToCanvas(ctx, frame, compositeCanvas.width, compositeCanvas.height, {
              charset: settings.asciiCharset,
              resolution: settings.asciiResolution,
              colorMode: settings.asciiColorMode,
              textColor: settings.asciiTextColor,
              backgroundColor: settings.backgroundColor,
              fontSize: settings.asciiFontSize,
              fontWeight: settings.asciiFontWeight,
              textOpacity: settings.asciiOpacity,
              backgroundOpacity: settings.asciiBackgroundOpacity,
              brightnessBoost: settings.asciiBrightnessBoost,
            });
          } catch (e) {
            // Silently handle errors
          }
        }, Math.max(1, frameIntervalMs / 2)); // Check frequently for frames

        // Store it for cleanup
        (recordingCanvas as any).__asciiCaptureInterval = compositeCaptureLoop;
      } else {
        // For non-ASCII, create composite canvas with export dimensions and crop
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = settings.exportWidth;
        compositeCanvas.height = settings.exportHeight;
        
        recordingCanvas = compositeCanvas;
        recordingStream = compositeCanvas.captureStream(settings.exportFps);

        // Downscaled processing canvas for dithering (huge performance gain)
        // Process at 50% resolution to match preview and drastically speed up dithering
        const processScale = 0.5;
        const processWidth = Math.round(cropWidth * processScale);
        const processHeight = Math.round(cropHeight * processScale);
        
        const processCanvas = document.createElement('canvas');
        processCanvas.width = processWidth;
        processCanvas.height = processHeight;

        let capturedFrames = 0;
        const recordingStartTime = Date.now();
        
        const compositeCaptureLoop = setInterval(() => {
          // Calculate which frame we should be on based on elapsed time
          const elapsed = Date.now() - recordingStartTime;
          const currentFrameNumber = Math.floor((elapsed / 1000) * settings.exportFps);

          // Only capture if we haven't already captured this frame
          if (currentFrameNumber <= capturedFrames) return;
          capturedFrames = currentFrameNumber;

          const ctx = compositeCanvas.getContext('2d');
          const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx || !processCtx) return;

          try {
            // Draw cropped WebGL directly to processing canvas (auto-scales)
            processCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, processWidth, processHeight);
            
            // Apply dithering/palette effects on downscaled image
            if (settings.ditheringEnabled || (settings.paletteType !== 'full')) {
              const imageData = processCtx.getImageData(0, 0, processWidth, processHeight);
              const palette = palettes[settings.paletteType].colors;

              // Use preview resolution directly for dithering (no further reduction needed)
              if (settings.ditheringEnabled) {
                if (settings.ditheringType === 'bayer') {
                  applyBayerDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                } else {
                  applyFloydSteinbergDithering(imageData.data, processWidth, processHeight, palette, settings.ditheringIntensity, settings.ditheringResolution);
                }
              } else {
                // Just reduce colors without dithering
                reduceColorsTopalette(imageData.data, palette);
              }

              // Put modified image data back
              processCtx.putImageData(imageData, 0, 0);
            }

            // Apply pixelation on top if enabled
            if (settings.pixelationEnabled && settings.pixelSize > 1) {
              applyPixelation(processCtx, processCanvas, settings.pixelSize);
            }

            // Draw upscaled processed image to composite canvas
            ctx.drawImage(processCanvas, 0, 0, processWidth, processHeight, 0, 0, settings.exportWidth, settings.exportHeight);
          } catch (e) {
            // Silently handle errors
          }
        }, Math.max(1, frameIntervalMs / 2)); // Check frequently for frames

        // Store it for cleanup
        (recordingCanvas as any).__compositeCaptureInterval = compositeCaptureLoop;
      }

      // Select MIME type and codec based on format and quality
      let mimeType: string;
      let videoBitsPerSecond: number;

      if (settings.exportFormat === 'mp4') {
        // Try H.264 codec in MP4 container (best compatibility and compression)
        const mp4Types = [
          'video/mp4;codecs=avc1',
          'video/mp4;codecs=avc1.42E01E',
          'video/mp4;codecs=h264',
          'video/mp4',
        ];
        
        mimeType = mp4Types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        videoBitsPerSecond = calculateBitrate(settings.exportWidth, settings.exportHeight, settings.exportQuality, settings.exportFps);
      } else {
        // WebM with VP9 or VP8
        const webmTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8',
          'video/webm',
        ];
        
        mimeType = webmTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
        videoBitsPerSecond = calculateBitrate(settings.exportWidth, settings.exportHeight, settings.exportQuality, settings.exportFps);
      }
      
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond: 128000,
      });

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const startTime = Date.now();

      mediaRecorder.start(100); // Collect data every 100ms

      // More precise frame-based stopping
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / exactDurationMs, 1);
        setExportProgress(progress);

        // Stop when we've elapsed our stop duration (slightly before the loop boundary)
        if (elapsed >= stopDurationMs || abortRef.current) {
          clearInterval(progressInterval);
          mediaRecorder.stop();
        }
      }, Math.max(5, frameIntervalMs / 2)); // Check at least every half-frame interval

      // Wait for recording to complete
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          clearInterval(progressInterval);

          // Clean up capture intervals if they exist
          if ((recordingCanvas as any).__asciiCaptureInterval) {
            clearInterval((recordingCanvas as any).__asciiCaptureInterval);
          }
          if ((recordingCanvas as any).__compositeCaptureInterval) {
            clearInterval((recordingCanvas as any).__compositeCaptureInterval);
          }

          if (!abortRef.current && chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const formatExt = settings.exportFormat === 'mp4' ? 'mp4' : 'webm';
            a.download = `loopforge-${settings.animationType}-${Date.now()}.${formatExt}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }

          resolve();
        };
      });

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting]);

  const cancelExport = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { isExporting, exportProgress, exportVideo, cancelExport };
}

