import { useRef, forwardRef, useImperativeHandle, useEffect, useCallback, useState, useMemo, memo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { AnimatedShapes } from './AnimatedShapes';
import { AnimationSettings } from '../types';
import { imageDataToASCIICells, renderASCIIToCanvas } from '../utils/asciiRenderer';
import { applyBayerDithering, applyFloydSteinbergDithering, applyJJNDithering, applyStuckiDithering, applySierraDithering, reduceColorsTopalette } from '../utils/dithering';
import { palettes } from '../utils/palettes';
import { applyPixelation } from '../utils/pixelation';

interface SceneLightsProps {
  shapeColor: string;
  shapeColor2: string;
}

// Memoize SceneLights to avoid recreating Three.Color objects every frame
const SceneLights = memo(function SceneLights({ shapeColor, shapeColor2 }: SceneLightsProps) {
  const color1 = useMemo(() => new THREE.Color(shapeColor), [shapeColor]);
  const color2 = useMemo(() => new THREE.Color(shapeColor2), [shapeColor2]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color={color1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={color2} />
      <pointLight position={[0, 10, -10]} intensity={0.3} color="#ffffff" />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
    </>
  );
});

function BackgroundPlane({ backgroundColor }: { backgroundColor: string }) {
  const { scene } = useThree();
  const bgColor = useMemo(() => new THREE.Color(backgroundColor), [backgroundColor]);

  useEffect(() => {
    scene.background = bgColor;
  }, [scene, bgColor]);

  return null;
}

interface CameraControllerProps {
  cameraPreset: string;
  cameraDistance: number;
  cameraAutoRotate: boolean;
  cameraAutoRotateSpeed: number;
  loopDuration: number;
  isPaused?: boolean;
}

function CameraController({ 
  cameraPreset, 
  cameraDistance, 
  cameraAutoRotate, 
  cameraAutoRotateSpeed,
  loopDuration,
  isPaused = false,
}: CameraControllerProps) {
  const { camera } = useThree();
  const prevPresetRef = useRef<string>(cameraPreset);
  const prevDistanceRef = useRef<number>(cameraDistance);

  // Only update camera position when preset or distance actually changes
  useEffect(() => {
    if (cameraPreset !== prevPresetRef.current || cameraDistance !== prevDistanceRef.current) {
      prevPresetRef.current = cameraPreset;
      prevDistanceRef.current = cameraDistance;

      if (cameraPreset !== 'custom') {
        switch (cameraPreset) {
          case 'front':
            camera.position.set(0, 0, cameraDistance);
            camera.lookAt(0, 0, 0);
            break;
          case 'top':
            camera.position.set(0, cameraDistance, 0);
            camera.lookAt(0, 0, 0);
            break;
          case 'side':
            camera.position.set(cameraDistance, 0, 0);
            camera.lookAt(0, 0, 0);
            break;
          case 'isometric':
            camera.position.set(cameraDistance, cameraDistance, cameraDistance);
            camera.lookAt(0, 0, 0);
            break;
        }
      } else if (!cameraAutoRotate) {
        camera.position.setLength(cameraDistance);
      }
    }
  }, [cameraPreset, cameraDistance, cameraAutoRotate, camera]);

  // Use faster math for auto-rotation
  useFrame(({ clock }) => {
    if (cameraAutoRotate && !isPaused) {
      const elapsed = clock.getElapsedTime();
      const loopT = (elapsed % loopDuration) / loopDuration;
      const angle = loopT * Math.PI * 2 * cameraAutoRotateSpeed * 0.5;
      
      // Direct position update is faster than setLength + rotation
      const nextX = Math.cos(angle) * cameraDistance;
      const nextZ = Math.sin(angle) * cameraDistance;
      
      // Only update if position actually changed significantly
      if (Math.abs(camera.position.x - nextX) > 0.001 || Math.abs(camera.position.z - nextZ) > 0.001) {
        camera.position.x = nextX;
        camera.position.z = nextZ;
        camera.lookAt(0, 0, 0);
      }
    }
  });

  return null;
}

export interface SceneHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

interface SceneProps {
  settings: AnimationSettings;
  showBorders: boolean;
  showOverlays: boolean;
  isPaused?: boolean;
}

/**
 * Retro Effects Component (Optimized)
 * applies dithering, palette reduction, and pixelation with reduced re-renders
 */
const RetroEffects = memo(function RetroEffects({ 
  glCanvas, 
  ditheringEnabled,
  pixelationEnabled,
  ditheringType,
  ditheringIntensity,
  ditheringResolution,
  paletteType,
  pixelSize,
}: { 
  glCanvas: HTMLCanvasElement | null; 
  ditheringEnabled: boolean;
  pixelationEnabled: boolean;
  ditheringType: string;
  ditheringIntensity: number;
  ditheringResolution: number;
  paletteType: string;
  pixelSize: number;
}) {
  const retroCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  // Memoize palette to avoid lookups every frame
  const palette = useMemo(() => palettes[paletteType as keyof typeof palettes]?.colors || [], [paletteType]);

  const render = useCallback(() => {
    if (!glCanvas || !retroCanvasRef.current) return;
    if (!ditheringEnabled && !pixelationEnabled) return;

    const retroCanvas = retroCanvasRef.current;
    const w = glCanvas.width;
    const h = glCanvas.height;

    // Ensure retro canvas matches the GL canvas size
    if (retroCanvas.width !== w || retroCanvas.height !== h) {
      retroCanvas.width = w;
      retroCanvas.height = h;
    }

    // Temp 2D canvas to read WebGL pixels
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
    }
    const temp = tempCanvasRef.current;
    if (temp.width !== w || temp.height !== h) {
      temp.width = w;
      temp.height = h;
    }

    const tempCtx = temp.getContext('2d', { willReadFrequently: true });
    const retroCtx = retroCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx || !retroCtx) return;

    try {
      // Copy WebGL pixels to temp canvas
      tempCtx.drawImage(glCanvas, 0, 0);
      
      // Draw temp canvas to retro canvas as base
      retroCtx.drawImage(temp, 0, 0);

      // Get image data to apply dithering/palette
      if (ditheringEnabled || paletteType !== 'full') {
        const imageData = retroCtx.getImageData(0, 0, w, h);

        // Apply dithering or palette reduction
        if (ditheringEnabled) {
          if (ditheringType === 'bayer') {
            applyBayerDithering(imageData.data, w, h, palette, ditheringIntensity, ditheringResolution);
          } else if (ditheringType === 'floydSteinberg') {
            applyFloydSteinbergDithering(imageData.data, w, h, palette, ditheringIntensity, ditheringResolution);
          } else if (ditheringType === 'jjn') {
            applyJJNDithering(imageData.data, w, h, palette, ditheringIntensity, ditheringResolution);
          } else if (ditheringType === 'stucki') {
            applyStuckiDithering(imageData.data, w, h, palette, ditheringIntensity, ditheringResolution);
          } else if (ditheringType === 'sierra') {
            applySierraDithering(imageData.data, w, h, palette, ditheringIntensity, ditheringResolution);
          }
        } else {
          // Just reduce colors without dithering
          reduceColorsTopalette(imageData.data, palette);
        }

        // Put modified image data back
        retroCtx.putImageData(imageData, 0, 0);
      }

      // Apply pixelation on top
      if (pixelationEnabled && pixelSize > 1) {
        applyPixelation(retroCtx, retroCanvas, pixelSize);
      }
    } catch (_) {
      // silently fail if canvas not ready
    }

    rafRef.current = requestAnimationFrame(render);
  }, [glCanvas, ditheringEnabled, pixelationEnabled, ditheringType, ditheringIntensity, ditheringResolution, paletteType, pixelSize, palette]);

  useEffect(() => {
    if (!ditheringEnabled && !pixelationEnabled) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ditheringEnabled, pixelationEnabled, render]);

  if (!ditheringEnabled && !pixelationEnabled) return null;

  return (
    <canvas
      ref={retroCanvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 10 }}
    />
  );
});

/**
 * ASCII Effect Component (Optimized)
 * completely replaces the 3D canvas with ASCII art.
 * Optimized with reduced re-renders via memo
 */
const ASCIIEffect = memo(function ASCIIEffect({ 
  glCanvas, 
  asciiEnabled,
  asciiCharset,
  asciiResolution,
  asciiInvert,
  asciiContrast,
  asciiGamma,
  asciiColorMode,
  asciiTextColor,
  backgroundColor,
  asciiFontSize,
  asciiFontWeight,
  asciiOpacity,
  asciiBackgroundOpacity,
  asciiBrightnessBoost,
}: { 
  glCanvas: HTMLCanvasElement | null; 
  asciiEnabled: boolean;
  asciiCharset: string;
  asciiResolution: number;
  asciiInvert: boolean;
  asciiContrast: number;
  asciiGamma: number;
  asciiColorMode: boolean;
  asciiTextColor: string;
  backgroundColor: string;
  asciiFontSize: number;
  asciiFontWeight: 'bold' | 'normal';
  asciiOpacity: number;
  asciiBackgroundOpacity: number;
  asciiBrightnessBoost: number;
}) {
  const asciiCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    if (!glCanvas || !asciiCanvasRef.current || !asciiEnabled) return;

    const asciiCanvas = asciiCanvasRef.current;
    const w = glCanvas.width;
    const h = glCanvas.height;

    // Ensure ascii canvas matches the GL canvas size
    if (asciiCanvas.width !== w || asciiCanvas.height !== h) {
      asciiCanvas.width = w;
      asciiCanvas.height = h;
    }

    // Temp 2D canvas to read WebGL pixels
    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas');
    }
    const temp = tempCanvasRef.current;
    if (temp.width !== w || temp.height !== h) {
      temp.width = w;
      temp.height = h;
    }

    const tempCtx = temp.getContext('2d', { willReadFrequently: true });
    const asciiCtx = asciiCanvas.getContext('2d');
    if (!tempCtx || !asciiCtx) return;

    try {
      // Copy WebGL pixels to temp canvas
      tempCtx.drawImage(glCanvas, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, w, h);

      // Convert to ASCII cell grid
      const frame = imageDataToASCIICells(imageData, w, h, {
        charset: asciiCharset as any,
        resolution: asciiResolution,
        invert: asciiInvert,
        contrast: asciiContrast,
        gamma: asciiGamma,
        colorMode: asciiColorMode,
        textColor: asciiTextColor,
        backgroundColor: backgroundColor,
      });

      // Render ASCII characters to the canvas
      renderASCIIToCanvas(asciiCtx, frame, w, h, {
        charset: asciiCharset as any,
        resolution: asciiResolution,
        colorMode: asciiColorMode,
        textColor: asciiTextColor,
        backgroundColor: backgroundColor,
        fontSize: asciiFontSize,
        fontWeight: asciiFontWeight,
        textOpacity: asciiOpacity,
        backgroundOpacity: asciiBackgroundOpacity,
        brightnessBoost: asciiBrightnessBoost,
      });
    } catch (_) {
      // silently fail if canvas not ready
    }

    rafRef.current = requestAnimationFrame(render);
  }, [
    glCanvas,
    asciiEnabled,
    asciiCharset,
    asciiResolution,
    asciiInvert,
    asciiContrast,
    asciiGamma,
    asciiColorMode,
    asciiTextColor,
    backgroundColor,
    asciiFontSize,
    asciiFontWeight,
    asciiOpacity,
    asciiBackgroundOpacity,
    asciiBrightnessBoost,
  ]);

  useEffect(() => {
    if (!asciiEnabled) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [asciiEnabled, render]);

  if (!asciiEnabled) return null;

  return (
    <canvas
      ref={asciiCanvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 10 }}
    />
  );
});

const ResolutionBorders = memo(function ResolutionBorders({ 
  exportWidth, 
  exportHeight, 
  containerRef 
}: { 
  exportWidth: number;
  exportHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null> 
}) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    
    const handleResize = () => updateDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerRef]);

  const aspectRatio = exportWidth / exportHeight;
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;
  const screenAspectRatio = screenWidth / screenHeight;

  const borderStyle = useMemo(() => {
    let borderWidth, borderHeight, borderLeft, borderTop;

    if (aspectRatio > screenAspectRatio) {
      // Export is wider than screen, fit width
      borderWidth = screenWidth;
      borderHeight = screenWidth / aspectRatio;
      borderLeft = 0;
      borderTop = (screenHeight - borderHeight) / 2;
    } else {
      // Export is taller than screen, fit height
      borderHeight = screenHeight;
      borderWidth = screenHeight * aspectRatio;
      borderTop = 0;
      borderLeft = (screenWidth - borderWidth) / 2;
    }

    return {
      border: '2px solid rgba(255, 255, 255, 0.8)',
      borderRadius: '4px',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5)',
      left: `${borderLeft}px`,
      top: `${borderTop}px`,
      width: `${borderWidth}px`,
      height: `${borderHeight}px`,
    };
  }, [aspectRatio, screenWidth, screenHeight]);

  if (dimensions.width === 0 || dimensions.height === 0) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20"
      style={borderStyle}
    />
  );
});

export const Scene = forwardRef<SceneHandle, SceneProps>(function Scene({ settings, showBorders, showOverlays, isPaused = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }));

  // Memoize canvas GL options to avoid recreating every render
  const glConfig = useMemo(() => ({
    preserveDrawingBuffer: true,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance' as const,
  }), []);

  // Memoize camera config
  const cameraConfig = useMemo(() => ({
    position: [0, 0, settings.cameraDistance] as [number, number, number],
    fov: 50,
  }), [settings.cameraDistance]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <Canvas
        ref={canvasRef}
        camera={cameraConfig}
        gl={glConfig}
        dpr={[1, 2]}
        style={{ background: settings.backgroundColor }}
      >
        <BackgroundPlane backgroundColor={settings.backgroundColor} />
        <CameraController 
          cameraPreset={settings.cameraPreset}
          cameraDistance={settings.cameraDistance}
          cameraAutoRotate={settings.cameraAutoRotate}
          cameraAutoRotateSpeed={settings.cameraAutoRotateSpeed}
          loopDuration={settings.loopDuration}
          isPaused={isPaused}
        />
        <SceneLights 
          shapeColor={settings.shapeColor}
          shapeColor2={settings.shapeColor2}
        />
        <AnimatedShapes settings={settings} isPaused={isPaused} />
        {settings.reflectionsEnabled && (
          <Environment preset="city" environmentIntensity={0.2} />
        )}
        {!settings.cameraAutoRotate && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={20}
          />
        )}
      </Canvas>
      <RetroEffects 
        glCanvas={canvasRef.current} 
        ditheringEnabled={settings.ditheringEnabled}
        pixelationEnabled={settings.pixelationEnabled}
        ditheringType={settings.ditheringType}
        ditheringIntensity={settings.ditheringIntensity}
        ditheringResolution={settings.ditheringResolution}
        paletteType={settings.paletteType}
        pixelSize={settings.pixelSize}
      />
      <ASCIIEffect 
        glCanvas={canvasRef.current}
        asciiEnabled={settings.asciiEnabled}
        asciiCharset={settings.asciiCharset}
        asciiResolution={settings.asciiResolution}
        asciiInvert={settings.asciiInvert}
        asciiContrast={settings.asciiContrast}
        asciiGamma={settings.asciiGamma}
        asciiColorMode={settings.asciiColorMode}
        asciiTextColor={settings.asciiTextColor}
        backgroundColor={settings.backgroundColor}
        asciiFontSize={settings.asciiFontSize}
        asciiFontWeight={settings.asciiFontWeight}
        asciiOpacity={settings.asciiOpacity}
        asciiBackgroundOpacity={settings.asciiBackgroundOpacity}
        asciiBrightnessBoost={settings.asciiBrightnessBoost}
      />
      {showBorders && showOverlays && (
        <ResolutionBorders 
          exportWidth={settings.exportWidth}
          exportHeight={settings.exportHeight}
          containerRef={containerRef} 
        />
      )}
    </div>
  );
});
