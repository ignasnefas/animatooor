import { useState, useRef, useCallback } from 'react';
import { Scene, SceneHandle } from './components/Scene';
import { SettingsPanel } from './components/SettingsPanel';
import { LoopProgressIndicator } from './components/LoopProgressIndicator';
import { Preset } from './types';
import { defaultSettings } from './presets';
import { useVideoExport } from './hooks/useVideoExport';
import { Menu, X, Play, Pause } from 'lucide-react';
import type { AnimationSettings } from './types';

export function App() {
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const sceneRef = useRef<SceneHandle>(null);
  const { isExporting, exportProgress, exportVideo } = useVideoExport();

  const handleExport = useCallback(async () => {
    const canvas = sceneRef.current?.getCanvas();
    if (canvas) {
      await exportVideo(canvas, settings);
    }
  }, [exportVideo, settings]);

  const handleApplyPreset = useCallback((preset: Preset) => {
    setSettings({ ...defaultSettings, ...preset.settings });
  }, []);

  const handleReset = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#0a0a0f]">
      {/* Main canvas area */}
      <div className="flex-1 relative">
        {/* 3D Scene */}
        <div className={`w-full h-full transition-opacity duration-300 ${isPaused ? 'opacity-50' : ''}`}>
        <Scene ref={sceneRef} settings={settings} showBorders={showBorders} showOverlays={showOverlays} isPaused={isPaused} />
        </div>

        {/* Top bar overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-all"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Playback controls */}
          {showOverlays && (
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white hover:bg-black/60 transition-all"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>

              <div className="px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                <span className="text-xs text-white/50 font-mono">
                  Loop: {settings.loopDuration}s · {settings.exportFps}fps
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Loop Progress Indicator */}
        {showOverlays && <LoopProgressIndicator loopDuration={settings.loopDuration} isPaused={isPaused} />}

        {/* Bottom info bar */}
        {showOverlays && (
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                <span className="text-xs text-white/50">
                  {settings.geometryType} · {settings.animationType} · {settings.shapeCount} shape{settings.shapeCount > 1 ? 's' : ''}
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                <span className="text-xs text-white/50">
                  {settings.exportWidth}×{settings.exportHeight}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loop status indicator */}
        {showOverlays && (
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/5 pointer-events-none">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-[10px] text-white/40 font-medium">
              {isPaused ? 'PAUSED' : 'PLAYING'}
            </span>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div
        className={`
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
          fixed right-0 top-0 h-full w-80 z-50
          lg:relative lg:translate-x-0 lg:w-80 lg:min-w-80
          transition-transform duration-300 ease-in-out
        `}
      >
        <SettingsPanel
          settings={settings}
          onSettingsChange={setSettings}
          onExport={handleExport}
          isExporting={isExporting}
          exportProgress={exportProgress}
          onApplyPreset={handleApplyPreset}
          onReset={handleReset}
          showBorders={showBorders}
          onToggleBorders={() => setShowBorders(!showBorders)}
          showOverlays={showOverlays}
          onToggleOverlays={() => setShowOverlays(!showOverlays)}
        />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

