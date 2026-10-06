import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(+(new URLSearchParams(location.search).get('dpr') || 1)); renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb8c8e0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x666655, 1.4)); const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(3, 5, 4); scene.add(d);
const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100); cam.position.set(0, 1.0, 5.2); cam.lookAt(0, 0.95, 0);
const g = await new GLTFLoader().loadAsync('../assets/Michelle.glb');
const names = []; g.scene.traverse((o) => { if (o.isBone) names.push(o.name); });
console.log('BONES', names.join(','));
const box = new THREE.Box3().setFromObject(g.scene); console.log('BOX', JSON.stringify(box.min), JSON.stringify(box.max));
const people = [];
for (let i = 0; i < 4; i++) { const o = SkeletonUtils.clone(g.scene); o.position.x = (i - 1.5) * 1.2; scene.add(o); people.push(o); }
window.people = people;
window.T_END = 10; window.READY = true;
window.renderAt = (T) => { renderer.render(scene, cam); };
