import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

const vertexShader = `
  uniform float uTime;
  attribute float aSize;
  attribute float aRandomness;
  attribute float aSide; // 1.0 for right, -1.0 for left
  attribute float aFeatherPos; // 0.0 (top/bone) to 1.0 (tip of feather)
  
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Graceful Angelic Flap Animation
    // We rotate the entire wing, but delay the tip movement slightly for fluidity
    
    float flapSpeed = 0.8;
    float flapAmp = 0.25;
    
    // Base flap angle
    float baseAngle = sin(uTime * flapSpeed) * flapAmp;
    
    // Wave motion propagating along the wing (x-axis)
    float waveOffset = pos.x * 0.2; 
    float localAngle = sin(uTime * flapSpeed - waveOffset) * flapAmp;
    
    // Combine for complex motion
    float finalAngle = (baseAngle * 0.3 + localAngle * 0.7) * aSide;

    // Rotation logic (Rotate around Z axis near the spine)
    // Pivot roughly at x=0
    float c = cos(finalAngle);
    float s = sin(finalAngle);
    
    float ox = pos.x;
    float oy = pos.y - 6.0; // Offset pivot to relative local space roughly
    
    // Rotate
    float nx = ox * c - oy * s;
    float ny = ox * s + oy * c;
    
    pos.x = nx;
    pos.y = ny + 6.0; // Restore offset

    // "Feather" micro-movement
    // Tips of feathers flutter more
    float flutter = sin(uTime * 5.0 + pos.x + pos.y) * 0.05 * aFeatherPos;
    pos.z += flutter;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Alpha gradient: solid at bone, ethereal at tips
    vAlpha = 0.6 + 0.4 * (1.0 - aFeatherPos);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float ll = length(xy);
    if(ll > 0.5) discard;

    // Soft fuzzy glow for feathers
    float glow = pow(1.0 - (ll * 2.0), 1.5);
    gl_FragColor = vec4(uColor, vAlpha * glow);
  }
`;

const WingsParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, randomness, sides, featherPos } = useMemo(() => {
    const count = CONFIG.wingParticleCount;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randomness = new Float32Array(count);
    const sides = new Float32Array(count);
    const featherPos = new Float32Array(count); // 0 = bone, 1 = tip

    const wingSpan = 8.0; // Wider wings
    const heightOffset = CONFIG.treeHeight * 0.65; 

    for (let i = 0; i < count; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      
      // t is horizontal distance along wing (0 = spine, 1 = wing tip)
      // Use power to put more density near the body
      const t = Math.pow(Math.random(), 0.8); 
      
      // Determine vertical position (feather length) at this t
      // We want distinct shapes: Arching bone, then hanging feathers.
      
      // The "Bone" curve (Top edge)
      // Goes up initially, then arches down
      const boneY = Math.sin(t * Math.PI) * 2.5 + (1.0 - t) * 1.0;
      
      // Feather Length at this position t
      // Feathers are short at start, long in middle, medium at tip
      const maxLen = 4.5 * Math.sin(Math.pow(t, 0.7) * Math.PI); 
      
      // r is vertical position within the feather length (0 = top/bone, 1 = bottom tip)
      // Bias towards top for density (bone structure)
      const r = Math.pow(Math.random(), 1.2); 
      
      let x = t * wingSpan;
      let y = boneY - (r * maxLen); // Hang down from bone
      
      // Z-depth (Volume)
      // Wings sweep back (positive Z is back in this coordinate system usually, but camera is +Z looking -Z?)
      // Wait, standard three.js: camera at +Z. We want wings BEHIND tree?
      // Tree is at 0,0,0. We want wings slightly behind.
      // Sweep: Tips go back
      let z = -1.5 - (t * 2.5); 
      
      // Add volume thickness (thick at bone, thin at tip)
      const thickness = 0.8 * (1.0 - t) * (1.0 - r * 0.5);
      z += (Math.random() - 0.5) * thickness;
      
      // Layering: "Coverts" (top feathers) usually bulge out slightly
      z += Math.sin(r * Math.PI) * 0.3;

      // Apply Side Mirroring
      x *= side;
      
      // Final Position
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + heightOffset;
      positions[i * 3 + 2] = z;

      // Size: Bone particles small/dense, Tip particles large/wispy
      sizes[i] = (1.0 - r * 0.6) * (Math.random() * 0.6 + 0.4); 
      
      randomness[i] = Math.random();
      sides[i] = side;
      featherPos[i] = r;
    }

    return { positions, sizes, randomness, sides, featherPos };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
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
          attach="attributes-aSide"
          count={sides.length}
          array={sides}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aFeatherPos"
          count={featherPos.length}
          array={featherPos}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: COLORS.wing },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default WingsParticles;