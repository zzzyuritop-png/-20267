import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

const BaseRings: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, scales } = useMemo(() => {
    const count = CONFIG.ringCount;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const baseR = CONFIG.treeRadius;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      
      // Split into two distinct rings
      const isInnerRing = Math.random() > 0.4; // 60% inner, 40% outer
      
      let r;
      if (isInnerRing) {
        // Inner Ring: Radius ~ 5.4 to 9.0
        // Closer to the tree, slightly tighter
        r = baseR * (1.2 + Math.random() * 0.8);
      } else {
        // Outer Ring: Radius ~ 11.25 to 15.75
        // Further away, more dispersed
        r = baseR * (2.5 + Math.random() * 1.5);
      }
      
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      // Slight vertical variation near ground, outer ring slightly higher variation
      const ySpread = isInnerRing ? 0.5 : 0.8;
      const y = (Math.random() - 0.5) * ySpread - 1.0; 

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      scales[i] = Math.random();
    }
    return { positions, scales };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      // Slow rotation
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  const shader = {
    vertex: `
      attribute float aScale;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Size multiplier
        gl_PointSize = aScale * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragment: `
      uniform vec3 uColor;
      void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;
        // Soft glow
        float alpha = (1.0 - r * 2.0);
        alpha = pow(alpha, 1.5); 
        // Reduced opacity to 0.4 for a softer, less intense look
        gl_FragColor = vec4(uColor, alpha * 0.4);
      }
    `
  };

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
            attach="attributes-aScale"
            count={scales.length}
            array={scales}
            itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={shader.vertex}
        fragmentShader={shader.fragment}
        uniforms={{
          uColor: { value: COLORS.ringGold },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default BaseRings;