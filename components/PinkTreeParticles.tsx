import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

// Vertex Shader
const vertexShader = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uExplosion; // 0.0 = Tree, 1.0 = Exploded
  
  attribute float aSize;
  attribute float aRandomness;
  attribute vec3 aColor; 
  attribute vec3 aExplosionDir; // Pre-calculated direction for explosion
  
  varying vec3 vColor;
  varying float vAlpha;

  // Simple pseudo-random function
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vColor = aColor;
    vec3 pos = position;

    // --- Breathing Animation (Base State) ---
    float breath = sin(uTime * 1.5 + pos.y * 0.5 + aRandomness * 5.0);
    pos.x += pos.x * (breath * 0.02);
    pos.z += pos.z * (breath * 0.02);
    pos.y += sin(uTime * 0.5 + aRandomness * 10.0) * 0.05;

    // --- Explosion / Dispersion Logic ---
    // Non-linear interpolation for punchier effect
    float explodeFactor = smoothstep(0.0, 1.0, uExplosion);
    
    // Move particle outward based on pre-calculated direction + some curl/noise
    // We multiply by large numbers to spread them across the screen
    vec3 explosionOffset = aExplosionDir * explodeFactor * 25.0;
    
    // Add some spiral rotation during explosion
    float angle = explodeFactor * aRandomness * 5.0;
    float s = sin(angle);
    float c = cos(angle);
    
    // Rotate offset slightly
    float nx = explosionOffset.x * c - explosionOffset.z * s;
    float nz = explosionOffset.x * s + explosionOffset.z * c;
    explosionOffset.x = nx;
    explosionOffset.z = nz;
    
    // Lift particles up slightly as they explode (magical floating)
    explosionOffset.y += explodeFactor * 5.0 * aRandomness;

    pos += explosionOffset;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size attenuation
    // Scale down slightly when exploded to look like dust
    float sizeMix = mix(1.0, 0.6, explodeFactor);
    gl_PointSize = (aSize * sizeMix) * (300.0 / -mvPosition.z);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Fade out slightly when fully exploded
    vAlpha = 1.0 - (explodeFactor * 0.3); 
  }
`;

// Fragment Shader
const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float ll = length(xy);
    if(ll > 0.5) discard;

    float glow = 1.0 - (ll * 2.0);
    glow = pow(glow, 2.0); 

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

interface PinkTreeParticlesProps {
    explosionValue: number; // 0 to 1
}

const PinkTreeParticles: React.FC<PinkTreeParticlesProps> = ({ explosionValue }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Smooth out the explosion value transition
  const currentExplosion = useRef(0);

  // Generate Geometry Data
  const { positions, colors, sizes, randomness, explosionDirs } = useMemo(() => {
    const count = CONFIG.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randomness = new Float32Array(count);
    const explosionDirs = new Float32Array(count * 3);

    const tempColor = new THREE.Color();
    const vec3 = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      // Tree Shape
      const h = Math.random(); 
      const theta = Math.random() * Math.PI * 2;
      const maxR = (1 - h) * CONFIG.treeRadius;
      const r = maxR * Math.sqrt(Math.random()); 

      const x = r * Math.cos(theta);
      const y = h * CONFIG.treeHeight - (CONFIG.treeHeight / 2); 
      const z = r * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y + (CONFIG.treeHeight * 0.4);
      positions[i * 3 + 2] = z;

      // Color Logic
      const distRatio = r / (maxR + 0.001); 
      if (distRatio < 0.4) {
        tempColor.copy(COLORS.treeCore).lerp(COLORS.treeMid, distRatio / 0.4);
      } else {
        tempColor.copy(COLORS.treeMid).lerp(COLORS.treeOuter, (distRatio - 0.4) / 0.6);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      sizes[i] = (Math.random() * 0.5 + 0.5) * (1.0 - distRatio * 0.5) * 0.6; 
      randomness[i] = Math.random();

      // Explosion Direction logic
      // Instead of just normalizing position (which makes a hollow shell),
      // we add some chaotic upward/outward energy
      vec3.set(x, y, z).normalize();
      
      // Add randomness to direction
      vec3.x += (Math.random() - 0.5) * 1.5;
      vec3.y += (Math.random() - 0.1) * 1.0; // Bias upwards
      vec3.z += (Math.random() - 0.5) * 1.5;
      vec3.normalize();

      explosionDirs[i*3] = vec3.x;
      explosionDirs[i*3+1] = vec3.y;
      explosionDirs[i*3+2] = vec3.z;
    }

    return { positions, colors, sizes, randomness, explosionDirs };
  }, []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Lerp the explosion uniform for smooth animation
      // Interpolate towards the target prop value
      currentExplosion.current = THREE.MathUtils.lerp(
          currentExplosion.current, 
          explosionValue, 
          delta * 2.0 // Speed of transition
      );
      
      materialRef.current.uniforms.uExplosion.value = currentExplosion.current;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandomness"
          count={randomness.length}
          array={randomness}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aExplosionDir"
          count={explosionDirs.length}
          array={explosionDirs}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uHeight: { value: CONFIG.treeHeight },
          uExplosion: { value: 0 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default PinkTreeParticles;