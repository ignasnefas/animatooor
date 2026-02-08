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

  // Camera
  cameraDistance: number;
  cameraAutoRotate: boolean;
  cameraAutoRotateSpeed: number;

  // Effects
  bloomEnabled: boolean;
  bloomIntensity: number;
  motionBlurEnabled: boolean;
  motionBlurAmount: number;

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

  // Export
  exportWidth: number;
  exportHeight: number;
  exportFps: number;
  exportFormat: 'webm' | 'gif';
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
  | 'prism';

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
  | 'swirl';

export interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // emoji
  settings: Partial<AnimationSettings>;
}
