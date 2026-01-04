import React from 'react';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { CONFIG } from '../constants';
import { BlendFunction } from 'postprocessing';

const SceneEffects: React.FC = () => {
  return (
    <>
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below ground
        autoRotate
        autoRotateSpeed={0.5}
        target={[0, CONFIG.treeHeight / 2, 0]}
      />
      
      <EffectComposer disableNormalPass>
        <Bloom 
            intensity={CONFIG.bloomStrength} 
            luminanceThreshold={CONFIG.bloomThreshold} 
            luminanceSmoothing={0.9} 
            mipmapBlur
            radius={CONFIG.bloomRadius}
        />
        <ToneMapping 
            exposure={1.2} 
        />
      </EffectComposer>
    </>
  );
};

export default SceneEffects;
