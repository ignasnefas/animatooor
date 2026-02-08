import { useRef, useState, useCallback } from 'react';
import { AnimationSettings } from '../types';
import { imageDataToASCIICells, renderASCIIToCanvas } from '../utils/asciiRenderer';

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

        let lastFrameTime = Date.now();
        const compositeCaptureLoop = setInterval(() => {
          const now = Date.now();
          if (now - lastFrameTime < frameIntervalMs) return;

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
              textOpacity: settings.asciiOpacity,
              backgroundOpacity: settings.asciiBackgroundOpacity,
            });

            lastFrameTime = now;
          } catch (e) {
            // Silently handle errors
          }
        }, frameIntervalMs / 2);

        // Store it for cleanup
        (recordingCanvas as any).__asciiCaptureInterval = compositeCaptureLoop;
      } else {
        // For non-ASCII, create composite canvas with export dimensions and crop
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = settings.exportWidth;
        compositeCanvas.height = settings.exportHeight;
        
        recordingCanvas = compositeCanvas;
        recordingStream = compositeCanvas.captureStream(settings.exportFps);

        let lastFrameTime = Date.now();
        const compositeCaptureLoop = setInterval(() => {
          const now = Date.now();
          if (now - lastFrameTime < frameIntervalMs) return;

          const ctx = compositeCanvas.getContext('2d');
          if (!ctx) return;

          try {
            // Draw cropped region to composite canvas
            ctx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, settings.exportWidth, settings.exportHeight);
            lastFrameTime = now;
          } catch (e) {
            // Silently handle errors
          }
        }, frameIntervalMs / 2);

        // Store it for cleanup
        (recordingCanvas as any).__compositeCaptureInterval = compositeCaptureLoop;
      }

      const mimeType = 'video/webm;codecs=vp9';
      const fallbackMime = 'video/webm';
      
      const selectedMime = MediaRecorder.isTypeSupported(mimeType) ? mimeType : fallbackMime;
      
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000,
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
            const blob = new Blob(chunks, { type: selectedMime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `loopforge-${settings.animationType}-${Date.now()}.webm`;
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
      alert('Export failed. Please try again.');
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

