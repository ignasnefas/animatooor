export interface AnimationSettings {
  // Scene
  backgroundColor: string;
  backgroundGradient: boolean;
  backgroundGradientColor: string;

  // Geometry
  geometryType: GeometryType;
  shapeCount: number;
  shapeScale: number;
  shapeColor: string;
  shapeColor2: string;
  useGradientMaterial: boolean;
  wireframe: boolean;
  metalness: number;
  roughness: number;
  geometryDetail: number; // 0-6, controls subdivision/detail level of shapes
  reflectionsEnabled: boolean; // toggle environment reflections on/off

  // Animation
  animationType: AnimationType;
  loopDuration: number; // seconds for one complete loop
  speed: number;
  amplitude: number;
  spread: number;
  frequency: number; // for more complex oscillations
  phaseOffset: number; // phase offset for animations
  verticalAmplitude: number; // separate control for vertical movement
  horizontalAmplitude: number; // separate control for horizontal movement
  rotationMultiplier: number; // multiplier for rotation amount
  rotationAxis: 'x' | 'y' | 'z' | 'all'; // axis for rotation

  // Camera
  cameraDistance: number;
  cameraAutoRotate: boolean;
  cameraAutoRotateSpeed: number;
  cameraPreset: 'front' | 'top' | 'side' | 'isometric' | 'custom'; // camera preset positions

  // Render modes - ASCII
  asciiEnabled: boolean;
  asciiCharset: 'standard' | 'dense' | 'minimal' | 'blocks' | 'braille';
  asciiResolution: number;
  asciiOpacity: number; // 0-1, opacity of ASCII text
  asciiBackgroundOpacity: number; // 0-1, opacity of background
  asciiTextColor: string; // hex color for monochrome mode
  asciiFontSize: number; // pixels (now actually used!)
  asciiFontWeight: 'normal' | 'bold'; // font weight
  asciiInvert: boolean; // invert brightness
  asciiContrast: number; // 0-3, adjust contrast
  asciiGamma: number; // 0.5-2.0, gamma correction
  asciiColorMode: boolean; // true = colored ASCII from scene, false = monochrome
  asciiBrightnessBoost: number; // 0-2, additional brightness boost

  // Dithering & Palette Effects
  ditheringEnabled: boolean;
  ditheringType: 'bayer' | 'floydSteinberg' | 'jjn' | 'stucki' | 'sierra';
  ditheringIntensity: number; // 0-1
  ditheringResolution: number; // 0.05-1.0, lower = faster, in proportion to canvas
  paletteType: 'full' | 'nes' | 'gameboy' | 'commodore64' | 'atari2600' | 'zxspectrum' | 'amstradcpc' | 'apple2' | 'grayscale';
  pixelationEnabled: boolean;
  pixelSize: number; // pixels per block (1-32)

  // Export
  exportWidth: number;
  exportHeight: number;
  exportFps: number;
  exportFormat: 'webm' | 'mp4' | 'gif';
  exportQuality: 'good' | 'excellent' | 'maximum';
  exportLoopCount: number;
  seamlessLoopVerification: boolean;
}

export type GeometryType =
  | 'torus'
  | 'torusKnot'
  | 'icosahedron'
  | 'octahedron'
  | 'dodecahedron'
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'tetrahedron'
  | 'plane'
  | 'ring'
  | 'pyramid'
  | 'prism'
  | 'capsule'
  | 'ellipsoid'
  | 'hexagon'
  | 'star'
  | 'gear'
  | 'spiral'
  | 'heart'
  | 'diamond'
  | 'crystal';

export type AnimationType =
  | 'orbit'
  | 'breathe'
  | 'spiral'
  | 'wave'
  | 'explode'
  | 'morph'
  | 'cascade'
  | 'vortex'
  | 'pendulum'
  | 'kaleidoscope'
  | 'bounce'
  | 'twist'
  | 'pulse'
  | 'figure8'
  | 'helix'
  | 'ripple'
  | 'swirl'
  | 'simpleRotation';

export interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // emoji
  settings: Partial<AnimationSettings>;
}
