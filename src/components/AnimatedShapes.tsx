import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimationSettings, GeometryType } from '../types';

function createGeometry(type: GeometryType, detail: number = 1): THREE.BufferGeometry {
  // Detail affects subdivision level (0-3)
  const segments = Math.max(4, 8 + detail * 8); // 8, 16, 24, 32
  const radialSegments = Math.max(3, 6 + detail * 6); // 6, 12, 18, 24
  
  switch (type) {
    case 'torus':
      return new THREE.TorusGeometry(1, 0.4, segments, radialSegments);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.8, 0.3, segments * 4, radialSegments);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.8, detail);
    case 'octahedron':
      return new THREE.OctahedronGeometry(0.8, detail);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(0.8, detail);
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1, segments, segments, segments);
    case 'sphere':
      return new THREE.SphereGeometry(0.8, radialSegments, segments);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1.2, radialSegments);
    case 'cone':
      return new THREE.ConeGeometry(0.7, 1.2, radialSegments);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.8, detail);
    case 'plane':
      return new THREE.PlaneGeometry(1.2, 1.2, segments, segments);
    case 'ring':
      return new THREE.RingGeometry(0.4, 0.8, radialSegments);
    case 'pyramid':
      return new THREE.ConeGeometry(0.7, 1.2, radialSegments);
    case 'prism':
      return new THREE.CylinderGeometry(0.8, 0.8, 1, radialSegments);
    case 'capsule':
      // Create capsule using cylinder + spheres
      const capsuleGeometry = new THREE.CapsuleGeometry(0.5, 1.0, radialSegments, segments);
      return capsuleGeometry;
    case 'ellipsoid':
      return new THREE.SphereGeometry(0.8, radialSegments, segments, 0, Math.PI * 2, 0, Math.PI * 0.8);
    case 'hexagon':
      return new THREE.CylinderGeometry(0.8, 0.8, 0.2, radialSegments);
    case 'star':
      // Create star shape
      const starShape = new THREE.Shape();
      const outerRadius = 0.8;
      const innerRadius = 0.4;
      const spikes = 5 + detail * 2;
      
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
      }
      starShape.closePath();
      
      return new THREE.ExtrudeGeometry(starShape, { depth: 0.2, bevelEnabled: false });
    case 'gear':
      // Create gear shape
      const gearShape = new THREE.Shape();
      const gearRadius = 0.8;
      const toothCount = 8 + detail * 4;
      const toothHeight = 0.1;
      
      for (let i = 0; i < toothCount * 2; i++) {
        const angle = (i * Math.PI) / toothCount;
        const radius = i % 2 === 0 ? gearRadius : gearRadius - toothHeight;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) gearShape.moveTo(x, y);
        else gearShape.lineTo(x, y);
      }
      gearShape.closePath();
      
      // Add center hole
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, gearRadius * 0.3, 0, Math.PI * 2, false);
      gearShape.holes.push(holePath);
      
      return new THREE.ExtrudeGeometry(gearShape, { depth: 0.3, bevelEnabled: false });
    case 'spiral':
      // Create spiral using lathe geometry
      const spiralPoints = [];
      const numPoints = 100 + detail * 50;
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const angle = t * Math.PI * 4;
        const radius = 0.1 + t * 0.7;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        spiralPoints.push(new THREE.Vector2(x, y));
      }
      return new THREE.LatheGeometry(spiralPoints, radialSegments);
    case 'heart':
      // Create heart shape
      const heartShape = new THREE.Shape();
      const heartX = 0;
      const heartY = 0;
      
      heartShape.moveTo(heartX, heartY + 0.3);
      heartShape.bezierCurveTo(heartX, heartY + 0.3, heartX - 0.25, heartY + 0.3, heartX - 0.25, heartY + 0.05);
      heartShape.bezierCurveTo(heartX - 0.25, heartY - 0.2, heartX, heartY - 0.2, heartX, heartY - 0.2);
      heartShape.bezierCurveTo(heartX, heartY - 0.2, heartX + 0.25, heartY - 0.2, heartX + 0.25, heartY + 0.05);
      heartShape.bezierCurveTo(heartX + 0.25, heartY + 0.3, heartX, heartY + 0.3, heartX, heartY + 0.3);
      
      const heartDepth = 0.2 + detail * 0.1;
      return new THREE.ExtrudeGeometry(heartShape, { depth: heartDepth, bevelEnabled: false });
    case 'diamond':
      // Create diamond shape
      const diamondShape = new THREE.Shape();
      diamondShape.moveTo(0, 0.8);
      diamondShape.lineTo(0.6, 0);
      diamondShape.lineTo(0, -0.8);
      diamondShape.lineTo(-0.6, 0);
      diamondShape.closePath();
      
      const diamondDepth = 0.4 + detail * 0.2;
      return new THREE.ExtrudeGeometry(diamondShape, { depth: diamondDepth, bevelEnabled: false });
    case 'crystal':
      // Create crystal using octahedron with modifications
      const crystalGeometry = new THREE.OctahedronGeometry(0.8, detail);
      // Add some randomness to vertices for crystal effect
      const positions = crystalGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Add small random variations
        const variation = 0.05;
        positions.setX(i, x + (Math.random() - 0.5) * variation);
        positions.setY(i, y + (Math.random() - 0.5) * variation);
        positions.setZ(i, z + (Math.random() - 0.5) * variation);
      }
      crystalGeometry.attributes.position.needsUpdate = true;
      crystalGeometry.computeVertexNormals();
      return crystalGeometry;
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

  const geometry = useMemo(() => createGeometry(settings.geometryType, settings.geometryDetail), [settings.geometryType, settings.geometryDetail]);

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
    const rotMult = settings.rotationMultiplier;

    switch (settings.animationType) {
      case 'orbit': {
        const angle = phase + offset;
        const radius = spread * 0.5;
        meshRef.current.position.x = Math.cos(angle) * radius * hAmp;
        meshRef.current.position.y = Math.sin(angle * 2) * amp * 0.3 * vAmp;
        meshRef.current.position.z = Math.sin(angle) * radius;
        meshRef.current.rotation.x = (phase * 2 + offset) * rotMult;
        meshRef.current.rotation.y = (phase * 2 + offset) * rotMult;
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
        meshRef.current.rotation.x = (phase * 0.5 + offset) * rotMult;
        meshRef.current.rotation.y = (phase * 0.3 + offset) * rotMult;
        break;
      }
      case 'spiral': {
        const spiralAngle = phase + offset;
        const spiralRadius = (1 + Math.sin(phase + offset * 2)) * spread * 0.3;
        const height = Math.cos(phase + offset) * amp;
        meshRef.current.position.x = Math.cos(spiralAngle) * spiralRadius;
        meshRef.current.position.y = height;
        meshRef.current.position.z = Math.sin(spiralAngle) * spiralRadius;
        meshRef.current.rotation.x = (phase * 2) * rotMult;
        meshRef.current.rotation.z = (phase * 1.5) * rotMult;
        break;
      }
      case 'wave': {
        const waveX = (index - total / 2) * spread * 0.3 * hAmp;
        const waveY = Math.sin(phase * freq + offset) * amp * vAmp;
        const waveZ = Math.cos(phase * freq + offset * 0.5) * amp * 0.5;
        meshRef.current.position.x = waveX;
        meshRef.current.position.y = waveY;
        meshRef.current.position.z = waveZ;
        meshRef.current.rotation.x = (phase + offset) * rotMult;
        meshRef.current.rotation.y = (phase * 0.5) * rotMult;
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
        meshRef.current.rotation.x = (phase * 2 + offset) * rotMult;
        meshRef.current.rotation.y = (phase * 3 + offset) * rotMult;
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
        meshRef.current.rotation.x = (phase + offset) * rotMult;
        meshRef.current.rotation.y = (phase * 2) * rotMult;
        meshRef.current.rotation.z = (phase * 0.5 + offset) * rotMult;
        break;
      }
      case 'cascade': {
        const cascadeY = ((phase / (Math.PI * 2) + index / total) % 1) * spread * 2 - spread;
        const cascadeX = Math.sin(offset * 3) * spread * 0.3;
        const cascadeZ = Math.cos(offset * 5) * spread * 0.3;
        meshRef.current.position.x = cascadeX;
        meshRef.current.position.y = cascadeY;
        meshRef.current.position.z = cascadeZ;
        meshRef.current.rotation.x = (phase * 2 + offset) * rotMult;
        meshRef.current.rotation.z = (phase + offset) * rotMult;
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
        meshRef.current.rotation.x = (phase * 3) * rotMult;
        meshRef.current.rotation.y = (phase * 2 + offset) * rotMult;
        meshRef.current.rotation.z = phase * rotMult;
        break;
      }
      case 'pendulum': {
        const pendulumAngle = Math.sin(phase * freq + offset) * amp * 0.8;
        const pendulumX = (index - total / 2) * spread * 0.25 * hAmp;
        meshRef.current.position.x = pendulumX;
        meshRef.current.position.y = Math.cos(pendulumAngle) * 2 * vAmp - 1;
        meshRef.current.position.z = Math.sin(pendulumAngle) * 1;
        meshRef.current.rotation.z = pendulumAngle * rotMult;
        meshRef.current.rotation.x = (phase * 0.3) * rotMult;
        break;
      }
      case 'kaleidoscope': {
        const kAngle = offset + phase;
        const kR = spread * 0.4;
        const kMirror = index % 2 === 0 ? 1 : -1;
        meshRef.current.position.x = Math.cos(kAngle) * kR * kMirror * hAmp;
        meshRef.current.position.y = Math.sin(kAngle) * kR * vAmp;
        meshRef.current.position.z = Math.sin(phase + offset * 2) * amp * 0.5;
        meshRef.current.rotation.x = (phase * kMirror) * rotMult;
        meshRef.current.rotation.y = (phase * 2) * rotMult;
        meshRef.current.rotation.z = kAngle * rotMult;
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
        meshRef.current.rotation.x = (phase * 2 + offset) * rotMult;
        meshRef.current.rotation.z = (phase + offset) * rotMult;
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
        meshRef.current.rotation.x = twistAngle * rotMult;
        meshRef.current.rotation.y = (twistAngle * 1.5) * rotMult;
        meshRef.current.rotation.z = (twistAngle * 0.5) * rotMult;
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
        meshRef.current.rotation.x = (phase + offset) * rotMult;
        meshRef.current.rotation.y = (phase * 0.5) * rotMult;
        break;
      }
      case 'figure8': {
        const fig8Angle = phase * freq + offset;
        const fig8R = spread * 0.4;
        meshRef.current.position.x = Math.sin(fig8Angle) * fig8R * hAmp;
        meshRef.current.position.y = Math.sin(fig8Angle * 2) * amp * 0.5 * vAmp;
        meshRef.current.position.z = Math.cos(fig8Angle) * fig8R;
        meshRef.current.rotation.x = (phase * 2) * rotMult;
        meshRef.current.rotation.z = fig8Angle * rotMult;
        break;
      }
      case 'helix': {
        const helixAngle = phase * freq + offset;
        const helixR = spread * 0.3;
        const helixY = (phase / (Math.PI * 2)) * spread * 2 - spread;
        meshRef.current.position.x = Math.cos(helixAngle) * helixR * hAmp;
        meshRef.current.position.y = helixY * vAmp;
        meshRef.current.position.z = Math.sin(helixAngle) * helixR;
        meshRef.current.rotation.x = (phase * 3) * rotMult;
        meshRef.current.rotation.y = helixAngle * rotMult;
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
        meshRef.current.rotation.x = ripplePhase * rotMult;
        meshRef.current.rotation.z = (ripplePhase * 0.5) * rotMult;
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
        meshRef.current.rotation.x = (swirlAngle * 2) * rotMult;
        meshRef.current.rotation.y = swirlAngle * rotMult;
        meshRef.current.rotation.z = phase * rotMult;
        break;
      }
      case 'simpleRotation': {
        // Simple rotation around selected axis without position changes
        meshRef.current.position.x = Math.cos(offset) * spread * 0.2 * hAmp;
        meshRef.current.position.y = Math.sin(offset) * spread * 0.2 * vAmp;
        meshRef.current.position.z = 0;
        
        // Reset all rotations first
        meshRef.current.rotation.x = 0;
        meshRef.current.rotation.y = 0;
        meshRef.current.rotation.z = 0;
        
        // Apply rotation to selected axis
        const rotationValue = phase * rotMult;
        if (settings.rotationAxis === 'x' || settings.rotationAxis === 'all') {
          meshRef.current.rotation.x = rotationValue;
        }
        if (settings.rotationAxis === 'y' || settings.rotationAxis === 'all') {
          meshRef.current.rotation.y = rotationValue;
        }
        if (settings.rotationAxis === 'z' || settings.rotationAxis === 'all') {
          meshRef.current.rotation.z = rotationValue;
        }
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
