import * as THREE from 'three';

export const COLORS = {
  background: '#050205',
  treeCore: new THREE.Color('#ff0055'), // Deep Warm Pink
  treeMid: new THREE.Color('#ff5e78'), // Coral Pink
  treeOuter: new THREE.Color('#ffbd69'), // Gold/Peach
  snow: new THREE.Color('#ffffff'),
  ringGold: new THREE.Color('#ffeb3b'), // Brighter Yellow Gold
  star: new THREE.Color('#fff0f5'),
  wing: new THREE.Color('#ffffff'),
};

export const CONFIG = {
  treeHeight: 12,
  treeRadius: 4.5,
  particleCount: 15000,
  snowCount: 2000,
  ringCount: 6000, // Doubled for intense brightness
  starCount: 500,
  bloomThreshold: 0.2,
  bloomStrength: 2.2,
  bloomRadius: 0.7,
  wingParticleCount: 8000,
};