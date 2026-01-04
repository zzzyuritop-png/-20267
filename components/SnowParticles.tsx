import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

const SnowParticles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Define bounds
  const boxSize = 30;
  const count = CONFIG.snowCount;

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count); // Fall speed

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * boxSize;
      positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize;
      positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
      
      velocities[i] = Math.random() * 0.05 + 0.02; 
    }
    return { positions, velocities };
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    
    for (let i = 0; i < count; i++) {
      let y = posAttr.getY(i);
      y -= velocities[i];

      // Reset to top if below bottom
      if (y < -boxSize / 2) {
        y = boxSize / 2;
      }

      posAttr.setY(i, y);
    }
    
    posAttr.needsUpdate = true;
  });

  // Use a simple built-in circular texture logic or a tiny shader. 
  // For snow, simple PointsMaterial is cleaner but lets use shader for consistency and soft edges.
  const shader = useMemo(() => ({
    vertex: `
      attribute float aScale;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 60.0 / -mvPosition.z; // Constant size roughly
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragment: `
      uniform vec3 uColor;
      void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.3, 0.5, r);
        gl_FragColor = vec4(uColor, alpha * 0.8);
      }
    `
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={shader.vertex}
        fragmentShader={shader.fragment}
        uniforms={{
          uColor: { value: COLORS.snow },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default SnowParticles;
