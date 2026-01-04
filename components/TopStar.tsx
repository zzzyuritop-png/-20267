import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, COLORS } from '../constants';

const TopStar: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const count = CONFIG.starCount;

  const { positions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        // Sphere distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 1/3) * 0.8; // Radius of star cluster

        positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i*3+2] = r * Math.cos(phi);
    }
    return { positions };
  }, [count]);

  useFrame((state) => {
    if (groupRef.current) {
        groupRef.current.rotation.y = -state.clock.getElapsedTime() * 0.5;
        groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.treeHeight + 0.5, 0]}>
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <shaderMaterial
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                uniforms={{ uColor: { value: COLORS.star } }}
                vertexShader={`
                    void main() {
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = 10.0 * (50.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `}
                fragmentShader={`
                    uniform vec3 uColor;
                    void main() {
                        float d = distance(gl_PointCoord, vec2(0.5));
                        if(d > 0.5) discard;
                        float glow = pow(1.0 - d * 2.0, 3.0);
                        gl_FragColor = vec4(uColor, glow);
                    }
                `}
            />
        </points>
        {/* Central bright core for the star */}
        <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color={COLORS.star} />
        </mesh>
    </group>
  );
};

export default TopStar;
