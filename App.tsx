import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { COLORS, CONFIG } from './constants';
import PinkTreeParticles from './components/PinkTreeParticles';
import SnowParticles from './components/SnowParticles';
import BaseRings from './components/BaseRings';
import TopStar from './components/TopStar';
import SceneEffects from './components/SceneEffects';
import HandInteraction from './components/HandInteraction';

const App: React.FC = () => {
  // 0 = Tree Form, 1 = Exploded
  const [explosion, setExplosion] = useState(0);

  return (
    <div className="relative w-full h-full bg-black">
      {/* UI Overlay - Removed Title as requested */}
      
      {/* Hand Interaction Logic (Invisible) */}
      <HandInteraction onExplosionChange={setExplosion} />

      {/* Signature - Bottom Right, Fainter & Times New Roman */}
      <div className="absolute bottom-10 right-10 z-10 pointer-events-none">
         <p className="text-xl md:text-2xl tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-400 opacity-40 drop-shadow-[0_0_10px_rgba(255,215,0,0.2)]" style={{ fontFamily: "'Times New Roman', serif" }}>
           - Joyce
         </p>
      </div>

      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 8, 24], fov: 45 }}
        gl={{ 
            antialias: false, 
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true 
        }}
        dpr={[1, 2]} 
      >
        <color attach="background" args={[COLORS.background]} />
        
        <Suspense fallback={null}>
            {/* Main Tree - Reacts to explosion state */}
            <PinkTreeParticles explosionValue={explosion} />
            
            {/* Decorations - Fade them out when exploded? For now keep them for contrast or maybe fade ring */}
            {/* We can pass explosion prop to others if we want them to disappear, 
                but keeping the Star and Rings stable while tree explodes creates a nice "core" effect. */}
            <TopStar /> 
            <BaseRings />
            <SnowParticles />
            
            {/* Simple Floor Reflector */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Effects */}
            <SceneEffects />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;