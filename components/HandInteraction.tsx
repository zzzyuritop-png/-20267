import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface HandInteractionProps {
  onExplosionChange: (value: number) => void;
}

const HandInteraction: React.FC<HandInteractionProps> = ({ onExplosionChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let lastVideoTime = -1;

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        
        // Start Webcam
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: "user" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
             setLoaded(true);
             predict();
          });
        }
      } catch (err) {
        console.error("Error initializing hand tracking:", err);
      }
    };

    const predict = () => {
      if (videoRef.current && handLandmarker) {
        let startTimeMs = performance.now();
        if (videoRef.current.currentTime !== lastVideoTime) {
          lastVideoTime = videoRef.current.currentTime;
          const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
          
          if (results.landmarks && results.landmarks.length === 2) {
             // Two hands detected
             const handA = results.landmarks[0][0]; // Wrist of hand 1
             const handB = results.landmarks[1][0]; // Wrist of hand 2
             
             // Calculate distance between wrists (normalized 0-1 coords)
             const dx = handA.x - handB.x;
             const dy = handA.y - handB.y;
             const distance = Math.sqrt(dx * dx + dy * dy);
             
             // Interaction Logic:
             // Distance ~0.2 or less = Combined (Tree)
             // Distance ~0.6 or more = Open (Exploded)
             
             // Map 0.2->0.7 to 0->1
             let explosion = (distance - 0.2) * 2.5; 
             explosion = Math.max(0, Math.min(1, explosion));
             
             onExplosionChange(explosion);
          } else {
             // If 0 or 1 hand, drift back to Tree (0)
             onExplosionChange(0);
          }
        }
        animationFrameId = requestAnimationFrame(predict);
      }
    };

    setup();

    return () => {
      if(animationFrameId) cancelAnimationFrame(animationFrameId);
      if(handLandmarker) handLandmarker.close();
      if(videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
    }
  }, [onExplosionChange]);

  return (
    <>
      {/* Hidden Video Element for processing */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none"
      />
      
      {/* Optional: Subtle indicator that camera is active/loading */}
      {!loaded && (
         <div className="absolute bottom-5 left-10 text-white/20 text-xs font-sans">
             Initializing Vision...
         </div>
      )}
      {loaded && (
         <div className="absolute bottom-5 left-10 text-white/10 text-xs font-sans">
             Gesture Active
         </div>
      )}
    </>
  );
};

export default HandInteraction;