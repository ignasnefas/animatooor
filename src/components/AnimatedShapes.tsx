import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationSettings, GeometryType } from '../types';

function createGeometry(type: GeometryType): THREE.BufferGeometry {
  switch (type) {
    case 'torus':
      return new THREE.TorusGeometry(1, 0.4, 32, 64);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.8, 0.3, 128, 32);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.8, 0);
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.8, 0);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.8, 0);
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere':
      return new THREE.SphereGeometry(0.8, 32, 32);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1.2, 32);
    case 'cone':
      return new THREE.ConeGeometry(0.7, 1.2, 32);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.8, 0);
    case 'plane':
      return new THREE.PlaneGeometry(1.2, 1.2, 8, 8);
    case 'ring':
      return new THREE.RingGeometry(0.4, 0.8, 32);
    case 'pyramid':
      return new THREE.ConeGeometry(0.7, 1.2, 4);
    case 'prism':
      return new THREE.CylinderGeometry(0.8, 0.8, 1, 6);
    default:
      return new THREE.TorusKnotGeometry(0.8, 0.3, 128, 32);
  }
}

interface ShapeProps {
  settings: AnimationSettings;
  index: number;
  total: number;
}

function Shape({ settings, index, total }: ShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => createGeometry(settings.geometryType), [settings.geometryType]);

  const material = useMemo(() => {
    const color1 = new THREE.Color(settings.shapeColor);
    const color2 = new THREE.Color(settings.shapeColor2);
    const mixedColor = color1.clone().lerp(color2, total > 1 ? index / (total - 1) : 0);

    if (settings.wireframe) {
      return new THREE.MeshStandardMaterial({
        color: mixedColor,
        wireframe: true,
        emissive: mixedColor,
        emissiveIntensity: 0.3,
        metalness: settings.metalness,
        roughness: settings.roughness,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: mixedColor,
      metalness: settings.metalness,
      roughness: settings.roughness,
      emissive: mixedColor,
      emissiveIntensity: 0.15,
    });
  }, [settings.shapeColor, settings.shapeColor2, settings.wireframe, settings.metalness, settings.roughness, index, total]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    // Get raw elapsed time
    const t = clock.getElapsedTime();
    // Calculate loop position (0 to 1) based on loopDuration, independent of speed
    let loopT = (t % settings.loopDuration) / settings.loopDuration;
    
    // Ensure loopT stays in valid range [0, 1) to prevent floating point precision issues
    // that can cause jumps at loop boundaries, especially in exported videos
    if (loopT < 0) loopT += 1;
    
    // Base phase always goes from 0 to 2π for a complete cycle per loopDuration
    const basePhase = loopT * Math.PI * 2;
    // Speed affects how fast the animation moves within the cycle
    const phase = basePhase * settings.speed + settings.phaseOffset;
    const offset = total > 1 ? (index / total) * Math.PI * 2 : 0;
    const amp = settings.amplitude;
    const vAmp = settings.verticalAmplitude;
    const hAmp = settings.horizontalAmplitude;
    const spread = settings.spread;
    const freq = settings.frequency;

    switch (settings.animationType) {
      case 'orbit': {
        const angle = phase + offset;
        const radius = spread * 0.5;
        meshRef.current.position.x = Math.cos(angle) * radius * hAmp;
        meshRef.current.position.y = Math.sin(angle * 2) * amp * 0.3 * vAmp;
        meshRef.current.position.z = Math.sin(angle) * radius;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.y = phase * 2 + offset;
        break;
      }
      case 'breathe': {
        const breathScale = 1 + Math.sin(phase * freq + offset) * 0.3 * amp;
        const baseAngle = offset;
        const radius = spread * 0.4;
        meshRef.current.position.x = Math.cos(baseAngle) * radius * hAmp;
        meshRef.current.position.y = Math.sin(baseAngle) * radius * 0.5 * vAmp;
        meshRef.current.position.z = Math.sin(baseAngle * 0.7) * radius * 0.5;
        meshRef.current.scale.setScalar(breathScale * settings.shapeScale);
        meshRef.current.rotation.x = phase * 0.5 + offset;
        meshRef.current.rotation.y = phase * 0.3 + offset;
        break;
      }
      case 'spiral': {
        const spiralAngle = phase + offset;
        const spiralRadius = (1 + Math.sin(phase + offset * 2)) * spread * 0.3;
        const height = Math.cos(phase + offset) * amp;
        meshRef.current.position.x = Math.cos(spiralAngle) * spiralRadius;
        meshRef.current.position.y = height;
        meshRef.current.position.z = Math.sin(spiralAngle) * spiralRadius;
        meshRef.current.rotation.x = phase * 2;
        meshRef.current.rotation.z = phase * 1.5;
        break;
      }
      case 'wave': {
        const waveX = (index - total / 2) * spread * 0.3 * hAmp;
        const waveY = Math.sin(phase * freq + offset) * amp * vAmp;
        const waveZ = Math.cos(phase * freq + offset * 0.5) * amp * 0.5;
        meshRef.current.position.x = waveX;
        meshRef.current.position.y = waveY;
        meshRef.current.position.z = waveZ;
        meshRef.current.rotation.x = phase + offset;
        meshRef.current.rotation.y = phase * 0.5;
        break;
      }
      case 'explode': {
        const explodePhase = Math.sin(phase) * 0.5 + 0.5;
        const explodeRadius = explodePhase * spread;
        const theta = offset;
        const phi = (index / total) * Math.PI;
        meshRef.current.position.x = Math.sin(phi) * Math.cos(theta) * explodeRadius;
        meshRef.current.position.y = Math.sin(phi) * Math.sin(theta) * explodeRadius;
        meshRef.current.position.z = Math.cos(phi) * explodeRadius;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.y = phase * 3 + offset;
        const explodeScale = 0.5 + (1 - explodePhase) * 0.5;
        meshRef.current.scale.setScalar(explodeScale * settings.shapeScale);
        break;
      }
      case 'morph': {
        const morphAngle = phase + offset;
        const morphR = spread * 0.4 * (1 + 0.3 * Math.sin(phase * 3 + offset));
        meshRef.current.position.x = Math.cos(morphAngle) * morphR;
        meshRef.current.position.y = Math.sin(morphAngle * 2) * amp * 0.5;
        meshRef.current.position.z = Math.sin(morphAngle) * morphR * 0.5;
        const morphScale = 1 + Math.sin(phase * 2 + offset) * 0.4;
        meshRef.current.scale.setScalar(morphScale * settings.shapeScale);
        meshRef.current.rotation.x = phase + offset;
        meshRef.current.rotation.y = phase * 2;
        meshRef.current.rotation.z = phase * 0.5 + offset;
        break;
      }
      case 'cascade': {
        const cascadeY = ((phase / (Math.PI * 2) + index / total) % 1) * spread * 2 - spread;
        const cascadeX = Math.sin(offset * 3) * spread * 0.3;
        const cascadeZ = Math.cos(offset * 5) * spread * 0.3;
        meshRef.current.position.x = cascadeX;
        meshRef.current.position.y = cascadeY;
        meshRef.current.position.z = cascadeZ;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.z = phase + offset;
        const cascadeAlpha = 1 - Math.abs(cascadeY) / spread;
        meshRef.current.scale.setScalar(cascadeAlpha * settings.shapeScale);
        break;
      }
      case 'vortex': {
        const vortexAngle = phase * 2 + offset;
        const vortexR = spread * 0.3 * (1 + 0.5 * Math.sin(phase + offset));
        const vortexY = Math.sin(phase * 2 + offset) * amp * 0.5;
        meshRef.current.position.x = Math.cos(vortexAngle) * vortexR;
        meshRef.current.position.y = vortexY;
        meshRef.current.position.z = Math.sin(vortexAngle) * vortexR;
        meshRef.current.rotation.x = phase * 3;
        meshRef.current.rotation.y = phase * 2 + offset;
        meshRef.current.rotation.z = phase;
        break;
      }
      case 'pendulum': {
        const pendulumAngle = Math.sin(phase * freq + offset) * amp * 0.8;
        const pendulumX = (index - total / 2) * spread * 0.25 * hAmp;
        meshRef.current.position.x = pendulumX;
        meshRef.current.position.y = Math.cos(pendulumAngle) * 2 * vAmp - 1;
        meshRef.current.position.z = Math.sin(pendulumAngle) * 1;
        meshRef.current.rotation.z = pendulumAngle;
        meshRef.current.rotation.x = phase * 0.3;
        break;
      }
      case 'kaleidoscope': {
        const kAngle = offset + phase;
        const kR = spread * 0.4;
        const kMirror = index % 2 === 0 ? 1 : -1;
        meshRef.current.position.x = Math.cos(kAngle) * kR * kMirror * hAmp;
        meshRef.current.position.y = Math.sin(kAngle) * kR * vAmp;
        meshRef.current.position.z = Math.sin(phase + offset * 2) * amp * 0.5;
        meshRef.current.rotation.x = phase * kMirror;
        meshRef.current.rotation.y = phase * 2;
        meshRef.current.rotation.z = kAngle;
        const kScale = 0.8 + Math.sin(phase * 2 + offset) * 0.3;
        meshRef.current.scale.setScalar(kScale * settings.shapeScale);
        break;
      }
      case 'bounce': {
        const bounceY = Math.abs(Math.sin(phase * freq + offset)) * amp * vAmp;
        const bounceX = Math.cos(offset) * spread * 0.3 * hAmp;
        const bounceZ = Math.sin(offset) * spread * 0.3;
        meshRef.current.position.x = bounceX;
        meshRef.current.position.y = bounceY;
        meshRef.current.position.z = bounceZ;
        meshRef.current.rotation.x = phase * 2 + offset;
        meshRef.current.rotation.z = phase + offset;
        const bounceScale = 1 + Math.sin(phase * freq + offset) * 0.2;
        meshRef.current.scale.setScalar(bounceScale * settings.shapeScale);
        break;
      }
      case 'twist': {
        const twistAngle = phase * freq + offset;
        const twistR = spread * 0.4;
        meshRef.current.position.x = Math.cos(twistAngle) * twistR * hAmp;
        meshRef.current.position.y = Math.sin(twistAngle * 2) * amp * 0.5 * vAmp;
        meshRef.current.position.z = Math.sin(twistAngle) * twistR;
        meshRef.current.rotation.x = twistAngle;
        meshRef.current.rotation.y = twistAngle * 1.5;
        meshRef.current.rotation.z = twistAngle * 0.5;
        break;
      }
      case 'pulse': {
        const pulseScale = 1 + Math.sin(phase * freq + offset) * 0.5 * amp;
        const pulseX = Math.cos(offset) * spread * 0.2 * hAmp;
        const pulseZ = Math.sin(offset) * spread * 0.2;
        meshRef.current.position.x = pulseX;
        meshRef.current.position.y = Math.sin(phase * freq * 2 + offset) * amp * 0.3 * vAmp;
        meshRef.current.position.z = pulseZ;
        meshRef.current.scale.setScalar(pulseScale * settings.shapeScale);
        meshRef.current.rotation.x = phase + offset;
        meshRef.current.rotation.y = phase * 0.5;
        break;
      }
      case 'figure8': {
        const fig8Angle = phase * freq + offset;
        const fig8R = spread * 0.4;
        meshRef.current.position.x = Math.sin(fig8Angle) * fig8R * hAmp;
        meshRef.current.position.y = Math.sin(fig8Angle * 2) * amp * 0.5 * vAmp;
        meshRef.current.position.z = Math.cos(fig8Angle) * fig8R;
        meshRef.current.rotation.x = phase * 2;
        meshRef.current.rotation.z = fig8Angle;
        break;
      }
      case 'helix': {
        const helixAngle = phase * freq + offset;
        const helixR = spread * 0.3;
        const helixY = (phase / (Math.PI * 2)) * spread * 2 - spread;
        meshRef.current.position.x = Math.cos(helixAngle) * helixR * hAmp;
        meshRef.current.position.y = helixY * vAmp;
        meshRef.current.position.z = Math.sin(helixAngle) * helixR;
        meshRef.current.rotation.x = phase * 3;
        meshRef.current.rotation.y = helixAngle;
        break;
      }
      case 'ripple': {
        const rippleDist = (index / total) * spread;
        const ripplePhase = phase * freq - rippleDist * 0.5;
        const rippleY = Math.sin(ripplePhase) * amp * vAmp;
        const rippleX = (index - total / 2) * spread * 0.1 * hAmp;
        meshRef.current.position.x = rippleX;
        meshRef.current.position.y = rippleY;
        meshRef.current.position.z = Math.cos(ripplePhase) * amp * 0.5;
        meshRef.current.rotation.x = ripplePhase;
        meshRef.current.rotation.z = ripplePhase * 0.5;
        const rippleScale = 0.8 + Math.sin(ripplePhase) * 0.4;
        meshRef.current.scale.setScalar(rippleScale * settings.shapeScale);
        break;
      }
      case 'swirl': {
        const swirlAngle = phase * freq + offset;
        const swirlR = spread * 0.3 * (1 + 0.3 * Math.sin(phase + offset));
        meshRef.current.position.x = Math.cos(swirlAngle) * swirlR * hAmp;
        meshRef.current.position.y = Math.sin(swirlAngle * 2) * amp * 0.4 * vAmp;
        meshRef.current.position.z = Math.sin(swirlAngle) * swirlR;
        meshRef.current.rotation.x = swirlAngle * 2;
        meshRef.current.rotation.y = swirlAngle;
        meshRef.current.rotation.z = phase;
        break;
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} scale={settings.shapeScale} />
  );
}

interface AnimatedShapesProps {
  settings: AnimationSettings;
}

export function AnimatedShapes({ settings }: AnimatedShapesProps) {
  const shapes = useMemo(() => {
    return Array.from({ length: settings.shapeCount }, (_, i) => (
      <Shape key={`${i}-${settings.geometryType}-${settings.shapeCount}`} settings={settings} index={i} total={settings.shapeCount} />
    ));
  }, [settings]);

  return <>{shapes}</>;
}
