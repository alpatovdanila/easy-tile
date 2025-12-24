/**
 * Three.js scene initialization and management
 * This is a standalone module, NOT a React component
 */
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  Vector2,
  Vector3,
  TextureLoader,
  RepeatWrapping,
  Color,
  DoubleSide,
  CanvasTexture,
  AmbientLight,
  DirectionalLight,
} from 'three';
import { createOrbitControls, createRaycaster, getWallIdFromIntersection, mmToMeters } from '../lib/three';
import type { RootStore } from '../model';
import type { WallId } from '../types/wall.types';
import { autorun } from 'mobx';

let scene: Scene | null = null;
let camera: PerspectiveCamera | null = null;
let renderer: WebGLRenderer | null = null;
let controls: ReturnType<typeof createOrbitControls> | null = null;
let raycaster: ReturnType<typeof createRaycaster> | null = null;
let wallMeshes: Map<WallId | 'top' | 'bottom', Mesh> = new Map();
let animationFrameId: number | null = null;
let textureLoader: TextureLoader | null = null;
let mouseDownPosition: Vector2 | null = null;
let hasDragged = false;

/**
 * Generate a checkerboard texture programmatically
 */
function createCheckerboardTexture(
  tileSize: number,
  color1: string = '#ffffff',
  color2: string = '#cccccc'
): CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 256; // Texture size
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const tilesPerRow = Math.ceil(size / tileSize);
  
  for (let y = 0; y < tilesPerRow; y++) {
    for (let x = 0; x < tilesPerRow; x++) {
      const isEven = (x + y) % 2 === 0;
      ctx.fillStyle = isEven ? color1 : color2;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

export function initScene(container: HTMLElement, store: RootStore): void {
  // Initialize Three.js components
  scene = new Scene();
  scene.background = new Color(0xf0f0f0);

  // Add lighting to the scene
  const ambientLight = new AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new PerspectiveCamera(75, aspect, 0.1, 1000);
  // Position camera at center of room (inside)
  camera.position.set(0, 0, 0);
  // Look slightly forward to see the front wall
  camera.lookAt(0, 0, -1);

  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = createOrbitControls(camera, container);
  raycaster = createRaycaster(camera);
  textureLoader = new TextureLoader();

  // Initial room render
  updateRoom(store);

  // Subscribe to store changes
  autorun(() => {
    updateRoom(store);
  });

  // Track mouse down to detect drags
  container.addEventListener('mousedown', (event) => {
    mouseDownPosition = new Vector2(event.clientX, event.clientY);
    hasDragged = false;
  });

  // Track mouse move to detect if it's a drag
  container.addEventListener('mousemove', (event) => {
    if (mouseDownPosition) {
      const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
      const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
      // If mouse moved more than 5 pixels, consider it a drag
      if (deltaX > 5 || deltaY > 5) {
        hasDragged = true;
      }
    }
  });

  // Mouse up handler - keep hasDragged flag until click event processes
  container.addEventListener('mouseup', () => {
    mouseDownPosition = null;
    // Don't reset hasDragged here - let click handler check it first
  });

  // Mouse click handler for wall selection (only if not a drag)
  container.addEventListener('click', (event) => {
    // Only handle click if we haven't dragged during this interaction
    if (!hasDragged) {
      handleClick(event, container, store);
    }
    // Reset drag state after click is processed
    hasDragged = false;
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    handleResize(container);
  });

  // Start render loop
  animate();
}

function updateRoom(store: RootStore): void {
  if (!scene || !camera) return;

  // Clear existing walls
  wallMeshes.forEach((mesh) => {
    scene!.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
  wallMeshes.clear();

  const width = mmToMeters(store.room.width);
  const height = mmToMeters(store.room.height);
  const length = mmToMeters(store.room.length);

  // Create 6 walls
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfLength = length / 2;

  // Front wall (editable) - faces inward toward center (+Z direction)
  createWall(
    'front',
    new Vector3(0, 0, -halfLength),
    new Vector3(0, 0, 0),
    new Vector2(width, height),
    store.wall.wallConfigs.front,
    scene
  );

  // Back wall (editable) - faces inward toward center (-Z direction)
  createWall(
    'back',
    new Vector3(0, 0, halfLength),
    new Vector3(0, Math.PI, 0),
    new Vector2(width, height),
    store.wall.wallConfigs.back,
    scene
  );

  // Left wall (editable) - faces inward toward center (+X direction)
  createWall(
    'left',
    new Vector3(-halfWidth, 0, 0),
    new Vector3(0, Math.PI / 2, 0),
    new Vector2(length, height),
    store.wall.wallConfigs.left,
    scene
  );

  // Right wall (editable) - faces inward toward center (-X direction)
  createWall(
    'right',
    new Vector3(halfWidth, 0, 0),
    new Vector3(0, -Math.PI / 2, 0),
    new Vector2(length, height),
    store.wall.wallConfigs.right,
    scene
  );

  // Top wall (ceiling, non-editable)
  createWall(
    'top',
    new Vector3(0, halfHeight, 0),
    new Vector3(-Math.PI / 2, 0, 0),
    new Vector2(width, length),
    null,
    scene
  );

  // Bottom wall (floor, non-editable)
  createWall(
    'bottom',
    new Vector3(0, -halfHeight, 0),
    new Vector3(Math.PI / 2, 0, 0),
    new Vector2(width, length),
    null,
    scene
  );
}

function createWall(
  wallId: WallId | 'top' | 'bottom',
  position: Vector3,
  rotation: Vector3,
  size: Vector2,
  config: { imageUrl: string | null; tileWidth: number; tileHeight: number; spacing: number; groutColor: string } | null,
  scene: Scene
): void {
  const geometry = new PlaneGeometry(size.x, size.y);
  let material: MeshStandardMaterial;

  if (config && wallId !== 'top' && wallId !== 'bottom') {
    // Editable wall with tile configuration
    if (config.imageUrl) {
      const texture = textureLoader!.load(config.imageUrl);
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      
      const tileWidthM = mmToMeters(config.tileWidth);
      const tileHeightM = mmToMeters(config.tileHeight);
      const repeatX = size.x / tileWidthM;
      const repeatY = size.y / tileHeightM;
      
      texture.repeat.set(repeatX, repeatY);
      
      material = new MeshStandardMaterial({
        map: texture,
        side: DoubleSide,
      });
    } else {
      // No texture, use default checkerboard pattern
      const tileSizeM = mmToMeters(config.tileWidth);
      const baseColor = new Color(config.groutColor);
      const lighterColor = baseColor.clone().lerp(new Color(0xffffff), 0.3);
      const checkerboardTexture = createCheckerboardTexture(
        32, // 32px tiles in texture
        config.groutColor,
        `#${lighterColor.getHexString()}`
      );
      
      // Calculate repeat based on wall size and tile size
      const repeatX = size.x / tileSizeM;
      const repeatY = size.y / tileSizeM;
      checkerboardTexture.repeat.set(repeatX, repeatY);
      
      material = new MeshStandardMaterial({
        map: checkerboardTexture,
        side: DoubleSide,
      });
    }
  } else {
    // Non-editable wall (ceiling/floor) - default checkerboard pattern
    const defaultTexture = createCheckerboardTexture(32, '#f0f0f0', '#e0e0e0');
    const repeatX = size.x / 0.5; // 0.5m tiles
    const repeatY = size.y / 0.5;
    defaultTexture.repeat.set(repeatX, repeatY);
    
    material = new MeshStandardMaterial({
      map: defaultTexture,
      side: DoubleSide,
    });
  }

  const mesh = new Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.userData.wallId = wallId;
  
  scene.add(mesh);
  wallMeshes.set(wallId, mesh);
}

function handleClick(
  event: MouseEvent,
  container: HTMLElement,
  store: RootStore
): void {
  if (!camera || !raycaster || !scene) return;

  const rect = container.getBoundingClientRect();
  const mouse = new Vector2();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Only check editable walls
  const editableMeshes = Array.from(wallMeshes.entries())
    .filter(([id]) => id !== 'top' && id !== 'bottom')
    .map(([, mesh]) => mesh);

  const intersections = raycaster.intersectObjects(editableMeshes);

  if (intersections.length > 0) {
    const wallId = getWallIdFromIntersection(intersections[0]);
    if (wallId) {
      store.wall.selectWall(wallId);
    }
  }
}

function handleResize(container: HTMLElement): void {
  if (!camera || !renderer) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  const render = (): void => {
    if (controls && renderer && scene && camera) {
      controls.update();
      renderer.render(scene, camera);
    }
    animationFrameId = requestAnimationFrame(render);
  };

  render();
}

export function disposeScene(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (controls) {
    controls.dispose();
    controls = null;
  }

  wallMeshes.forEach((mesh) => {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
  wallMeshes.clear();

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
  raycaster = null;
  textureLoader = null;
}

