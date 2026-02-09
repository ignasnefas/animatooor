import { AnimationSettings, GeometryType, AnimationType } from '../types';
import { Preset } from '../types';
import { presets } from '../presets';
import { paletteList } from '../utils/palettes';
import {
  Palette,
  Box,
  Zap,
  Camera,
  Download,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Code2,
} from 'lucide-react';
import { useState } from 'react';

interface SettingsPanelProps {
  settings: AnimationSettings;
  onSettingsChange: (settings: AnimationSettings) => void;
  onExport: () => void;
  isExporting: boolean;
  exportProgress: number;
  onApplyPreset: (preset: Preset) => void;
  onReset: () => void;
  showBorders: boolean;
  onToggleBorders: () => void;
}

const geometryTypes: { value: GeometryType; label: string }[] = [
  { value: 'torusKnot', label: 'Torus Knot' },
  { value: 'torus', label: 'Torus' },
  { value: 'icosahedron', label: 'Icosahedron' },
  { value: 'octahedron', label: 'Octahedron' },
  { value: 'dodecahedron', label: 'Dodecahedron' },
  { value: 'tetrahedron', label: 'Tetrahedron' },
  { value: 'cube', label: 'Cube' },
  { value: 'sphere', label: 'Sphere' },
  { value: 'cylinder', label: 'Cylinder' },
  { value: 'cone', label: 'Cone' },
  { value: 'pyramid', label: 'Pyramid' },
  { value: 'plane', label: 'Plane' },
  { value: 'ring', label: 'Ring' },
  { value: 'prism', label: 'Prism' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'ellipsoid', label: 'Ellipsoid' },
  { value: 'hexagon', label: 'Hexagon' },
  { value: 'star', label: 'Star' },
  { value: 'gear', label: 'Gear' },
  { value: 'spiral', label: 'Spiral' },
  { value: 'heart', label: 'Heart' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'crystal', label: 'Crystal' },
];

const animationTypes: { value: AnimationType; label: string }[] = [
  { value: 'orbit', label: 'Orbit' },
  { value: 'breathe', label: 'Breathe' },
  { value: 'spiral', label: 'Spiral' },
  { value: 'wave', label: 'Wave' },
  { value: 'explode', label: 'Explode & Reform' },
  { value: 'morph', label: 'Morph' },
  { value: 'cascade', label: 'Cascade' },
  { value: 'vortex', label: 'Vortex' },
  { value: 'pendulum', label: 'Pendulum' },
  { value: 'kaleidoscope', label: 'Kaleidoscope' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'twist', label: 'Twist' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'figure8', label: 'Figure 8' },
  { value: 'helix', label: 'Helix' },
  { value: 'ripple', label: 'Ripple' },
  { value: 'swirl', label: 'Swirl' },
  { value: 'simpleRotation', label: 'Simple Rotation' },
];

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-white/90 hover:bg-white/5 transition-colors"
      >
        <Icon size={16} className="text-violet-400" />
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function SliderControl({ label, value, min, max, step, onChange, suffix = '' }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-xs text-white/60">{label}</label>
        <span className="text-xs text-white/40">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-violet-500/30"
      />
    </div>
  );
}

function SelectControl({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-white/60 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90
          focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorControl({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
        />
      </div>
      <div className="flex-1">
        <label className="text-xs text-white/60">{label}</label>
        <p className="text-xs text-white/30 font-mono">{value}</p>
      </div>
    </div>
  );
}

function ToggleControl({ label, value, onChange }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-white/60">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-violet-500' : 'bg-white/10'}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onExport,
  isExporting,
  exportProgress,
  onApplyPreset,
  onReset,
  showBorders,
  onToggleBorders,
}: SettingsPanelProps) {
  const update = (partial: Partial<AnimationSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d14]/95 backdrop-blur-xl border-l border-white/5">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">LoopForge</h1>
              <p className="text-[10px] text-white/40">3D Loop Generator</p>
            </div>
          </div>
          <button
            onClick={onReset}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {/* Presets */}
        <Section title="Presets" icon={Sparkles}>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10
                  border border-white/5 hover:border-violet-500/30 transition-all text-center group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{preset.thumbnail}</span>
                <span className="text-[10px] font-medium text-white/70 leading-tight">{preset.name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Geometry */}
        <Section title="Geometry" icon={Box}>
          <SelectControl
            label="Shape"
            value={settings.geometryType}
            options={geometryTypes}
            onChange={(v) => update({ geometryType: v as GeometryType })}
          />
          <SliderControl label="Count" value={settings.shapeCount} min={1} max={30} step={1} onChange={(v) => update({ shapeCount: v })} />
          <SliderControl label="Scale" value={settings.shapeScale} min={0.1} max={3} step={0.1} onChange={(v) => update({ shapeScale: v })} />
          <SliderControl label="Detail Level" value={settings.geometryDetail} min={0} max={3} step={1} onChange={(v) => update({ geometryDetail: v })} />
          <ToggleControl label="Wireframe" value={settings.wireframe} onChange={(v) => update({ wireframe: v })} />
          <SliderControl label="Metalness" value={settings.metalness} min={0} max={1} step={0.05} onChange={(v) => update({ metalness: v })} />
          <SliderControl label="Roughness" value={settings.roughness} min={0} max={1} step={0.05} onChange={(v) => update({ roughness: v })} />
        </Section>

        {/* Colors */}
        <Section title="Colors" icon={Palette}>
          <ColorControl label="Primary Color" value={settings.shapeColor} onChange={(v) => update({ shapeColor: v })} />
          <ColorControl label="Secondary Color" value={settings.shapeColor2} onChange={(v) => update({ shapeColor2: v })} />
          <ColorControl label="Background" value={settings.backgroundColor} onChange={(v) => update({ backgroundColor: v })} />
        </Section>

        {/* Animation */}
        <Section title="Animation" icon={Zap}>
          <SelectControl
            label="Type"
            value={settings.animationType}
            options={animationTypes}
            onChange={(v) => update({ animationType: v as AnimationType })}
          />
          <SliderControl label="Loop Duration" value={settings.loopDuration} min={1} max={10} step={0.5} onChange={(v) => update({ loopDuration: v })} suffix="s" />
          <SliderControl label="Speed" value={settings.speed} min={0.1} max={3} step={0.1} onChange={(v) => update({ speed: v })} suffix="x" />
          <SliderControl label="Amplitude" value={settings.amplitude} min={0.1} max={3} step={0.1} onChange={(v) => update({ amplitude: v })} />
          <SliderControl label="Vertical Amp" value={settings.verticalAmplitude} min={0.1} max={3} step={0.1} onChange={(v) => update({ verticalAmplitude: v })} />
          <SliderControl label="Horizontal Amp" value={settings.horizontalAmplitude} min={0.1} max={3} step={0.1} onChange={(v) => update({ horizontalAmplitude: v })} />
          <SliderControl label="Spread" value={settings.spread} min={0.5} max={8} step={0.5} onChange={(v) => update({ spread: v })} />
          <SliderControl label="Frequency" value={settings.frequency} min={0.5} max={5} step={0.5} onChange={(v) => update({ frequency: v })} suffix="x" />
          <SliderControl label="Phase Offset" value={settings.phaseOffset} min={0} max={Math.PI * 2} step={0.1} onChange={(v) => update({ phaseOffset: v })} suffix="rad" />
          <SliderControl label="Rotation Amount" value={settings.rotationMultiplier} min={0} max={5} step={0.1} onChange={(v) => update({ rotationMultiplier: v })} suffix="x" />
          <SelectControl
            label="Rotation Axis"
            value={settings.rotationAxis}
            options={[
              { value: 'x', label: 'X Axis' },
              { value: 'y', label: 'Y Axis' },
              { value: 'z', label: 'Z Axis' },
              { value: 'all', label: 'All Axes' },
            ]}
            onChange={(v) => update({ rotationAxis: v as 'x' | 'y' | 'z' | 'all' })}
          />
        </Section>

        {/* Camera */}
        <Section title="Camera" icon={Camera} defaultOpen={false}>
          <SelectControl
            label="Preset"
            value={settings.cameraPreset}
            options={[
              { value: 'front', label: 'Front / Head-on' },
              { value: 'top', label: 'Top' },
              { value: 'side', label: 'Side' },
              { value: 'isometric', label: 'Isometric' },
              { value: 'custom', label: 'Custom' },
            ]}
            onChange={(v) => update({ cameraPreset: v as 'front' | 'top' | 'side' | 'isometric' | 'custom' })}
          />
          <SliderControl label="Distance" value={settings.cameraDistance} min={2} max={15} step={0.5} onChange={(v) => update({ cameraDistance: v })} />
          <ToggleControl label="Auto Rotate" value={settings.cameraAutoRotate} onChange={(v) => update({ cameraAutoRotate: v })} />
          {settings.cameraAutoRotate && (
            <SliderControl label="Rotate Speed" value={settings.cameraAutoRotateSpeed} min={0.1} max={3} step={0.1} onChange={(v) => update({ cameraAutoRotateSpeed: v })} />
          )}
        </Section>

        {/* Render Modes */}
        <Section title="Render Modes" icon={Code2} defaultOpen={false}>
          <ToggleControl label="ASCII Effect" value={settings.asciiEnabled} onChange={(v) => update({ asciiEnabled: v })} />
          {settings.asciiEnabled && (
            <>
              <SelectControl
                label="Charset"
                value={settings.asciiCharset}
                options={[
                  { value: 'standard', label: 'Standard (.:-=+*#%@)' },
                  { value: 'dense', label: 'Dense (░▒▓█)' },
                  { value: 'blocks', label: 'Blocks (▁▂▃▄▅▆▇█)' },
                  { value: 'braille', label: 'Braille (⠁⠃⠇⠏⠟⠿⡿⣿)' },
                  { value: 'minimal', label: 'Minimal (.*#)' },
                ]}
                onChange={(v) => update({ asciiCharset: v as 'standard' | 'dense' | 'minimal' | 'blocks' | 'braille' })}
              />
              <SliderControl label="Resolution" value={settings.asciiResolution} min={20} max={200} step={5} onChange={(v) => update({ asciiResolution: v })} suffix=" chars" />
              <SliderControl label="Font Size" value={settings.asciiFontSize} min={4} max={100} step={1} onChange={(v) => update({ asciiFontSize: v })} suffix="px" />
              <SelectControl
                label="Font Weight"
                value={settings.asciiFontWeight}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'bold', label: 'Bold' },
                ]}
                onChange={(v) => update({ asciiFontWeight: v as 'normal' | 'bold' })}
              />
              <SliderControl label="Text Opacity" value={settings.asciiOpacity} min={0} max={1} step={0.1} onChange={(v) => update({ asciiOpacity: v })} />
              <SliderControl label="Background Opacity" value={settings.asciiBackgroundOpacity} min={0} max={1} step={0.1} onChange={(v) => update({ asciiBackgroundOpacity: v })} />
              <SliderControl label="Brightness Boost" value={settings.asciiBrightnessBoost} min={0.1} max={3} step={0.1} onChange={(v) => update({ asciiBrightnessBoost: v })} suffix="x" />
              <ToggleControl label="Color Mode" value={settings.asciiColorMode} onChange={(v) => update({ asciiColorMode: v })} />
              {!settings.asciiColorMode && (
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Text Color</label>
                  <input
                    type="color"
                    value={settings.asciiTextColor}
                    onChange={(e) => update({ asciiTextColor: e.target.value })}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              )}
              <SliderControl label="Contrast" value={settings.asciiContrast} min={0.5} max={3} step={0.1} onChange={(v) => update({ asciiContrast: v })} />
              <SliderControl label="Gamma" value={settings.asciiGamma} min={0.5} max={2} step={0.1} onChange={(v) => update({ asciiGamma: v })} />
              <ToggleControl label="Invert" value={settings.asciiInvert} onChange={(v) => update({ asciiInvert: v })} />
            </>
          )}
        </Section>

        {/* Retro Effects */}
        <Section title="Retro Effects" icon={Sparkles} defaultOpen={false}>
          {/* Dithering */}
          <ToggleControl label="Dithering" value={settings.ditheringEnabled} onChange={(v) => update({ ditheringEnabled: v })} />
          {settings.ditheringEnabled && (
            <>
              <SelectControl
                label="Dither Type"
                value={settings.ditheringType}
                options={[
                  { value: 'bayer', label: 'Bayer (Ordered)' },
                  { value: 'floydSteinberg', label: 'Floyd-Steinberg (Diffusion)' },
                ]}
                onChange={(v) => update({ ditheringType: v as 'bayer' | 'floydSteinberg' })}
              />
              <SliderControl
                label="Dither Intensity"
                value={settings.ditheringIntensity}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) => update({ ditheringIntensity: v })}
              />
              <SliderControl
                label="Dither Resolution"
                value={settings.ditheringResolution}
                min={0.05}
                max={1}
                step={0.05}
                onChange={(v) => update({ ditheringResolution: v })}
                suffix=" (lower = faster)"
              />
            </>
          )}

          {/* Palette */}
          <SelectControl
            label="Palette"
            value={settings.paletteType}
            options={paletteList}
            onChange={(v) => update({ paletteType: v as any })}
          />

          {/* Pixelation */}
          <ToggleControl label="Pixelation" value={settings.pixelationEnabled} onChange={(v) => update({ pixelationEnabled: v })} />
          {settings.pixelationEnabled && (
            <SliderControl
              label="Pixel Size"
              value={settings.pixelSize}
              min={1}
              max={32}
              step={1}
              onChange={(v) => update({ pixelSize: v })}
              suffix="px"
            />
          )}
        </Section>

        {/* Export */}
        <Section title="Export" icon={Download} defaultOpen={false}>
          <div className="mb-3">
            <label className="text-xs text-white/60 mb-2 block">Resolution Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update({ exportWidth: 1080, exportHeight: 1920 })}
                className={`p-2 rounded-lg text-xs font-medium transition-colors border ${
                  settings.exportWidth === 1080 && settings.exportHeight === 1920
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                📱 Story (1080×1920)
              </button>
              <button
                onClick={() => update({ exportWidth: 1080, exportHeight: 1080 })}
                className={`p-2 rounded-lg text-xs font-medium transition-colors border ${
                  settings.exportWidth === 1080 && settings.exportHeight === 1080
                    ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                📷 Feed (1080×1080)
              </button>
              <button
                onClick={() => update({ exportWidth: 1920, exportHeight: 1080 })}
                className={`p-2 rounded-lg text-xs font-medium transition-colors border ${
                  settings.exportWidth === 1920 && settings.exportHeight === 1080
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                🎬 Landscape (1920×1080)
              </button>
              <button
                onClick={() => update({ exportWidth: 2160, exportHeight: 2160 })}
                className={`p-2 rounded-lg text-xs font-medium transition-colors border ${
                  settings.exportWidth === 2160 && settings.exportHeight === 2160
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                🔥 4K (2160×2160)
              </button>
            </div>
          </div>
          <SelectControl
            label="Custom Resolution"
            value={`${settings.exportWidth}x${settings.exportHeight}`}
            options={[
              { value: '720x720', label: '720 × 720 (Square)' },
              { value: '1080x1080', label: '1080 × 1080 (Square)' },
              { value: '1080x1920', label: '1080 × 1920 (Vertical - Instagram Story)' },
              { value: '1920x1080', label: '1920 × 1080 (Landscape)' },
              { value: '2160x2160', label: '2160 × 2160 (4K Square)' },
            ]}
            onChange={(v) => {
              const [w, h] = v.split('x').map(Number);
              update({ exportWidth: w, exportHeight: h });
            }}
          />
          <SliderControl label="FPS" value={settings.exportFps} min={15} max={60} step={5} onChange={(v) => update({ exportFps: v })} />
          <SliderControl label="Loop Count" value={settings.exportLoopCount} min={1} max={5} step={1} onChange={(v) => update({ exportLoopCount: v })} suffix="x" />
          <SelectControl
            label="Quality"
            value={settings.exportQuality}
            options={[
              { value: 'good', label: 'Good (Smaller file)' },
              { value: 'excellent', label: 'Excellent (Balanced)' },
              { value: 'maximum', label: 'Maximum (Best quality)' },
            ]}
            onChange={(v) => update({ exportQuality: v as 'good' | 'excellent' | 'maximum' })}
          />
          <SelectControl
            label="Format"
            value={settings.exportFormat}
            options={[
              { value: 'webm', label: 'WebM (VP9, best compression)' },
              { value: 'mp4', label: 'MP4 (H.264, best compatibility)' },
              { value: 'gif', label: 'GIF (requires gif.js library)' },
            ]}
            onChange={(v) => update({ exportFormat: v as 'webm' | 'mp4' | 'gif' })}
          />
          <ToggleControl label="Seamless Loop Verification" value={settings.seamlessLoopVerification} onChange={(v) => update({ seamlessLoopVerification: v })} />
          <ToggleControl label="Show Resolution Borders" value={showBorders} onChange={onToggleBorders} />
        </Section>
      </div>

      {/* Export button */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={onExport}
          disabled={isExporting}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
            ${isExporting
              ? 'bg-violet-500/20 text-violet-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40'
            }`}
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
              <span>Exporting... {Math.round(exportProgress * 100)}%</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Export Video</span>
            </>
          )}
        </button>
        {isExporting && (
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
              style={{ width: `${exportProgress * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
