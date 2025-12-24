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
  Group,
} from 'three';
import {
  createOrbitControls,
  createRaycaster,
  getWallIdFromIntersection,
  mmToMeters,
  createWallPerimeterLine,
  updatePerimeterLineAnimation,
} from '../lib/three';
import type { RootStore } from '../model';
import type { WallId } from '../types/wall.types';
import { autorun } from 'mobx';

let scene: Scene | null = null;
let camera: PerspectiveCamera | null = null;
let renderer: WebGLRenderer | null = null;
let controls: ReturnType<typeof createOrbitControls> | null = null;
let raycaster: ReturnType<typeof createRaycaster> | null = null;
let wallMeshes: Map<WallId | 'top' | 'bottom', Mesh> = new Map();
let wallOriginalMaterials: Map<WallId, MeshStandardMaterial> = new Map();
let perimeterLines: Map<WallId, Group> = new Map();
let animationFrameId: number | null = null;
let textureLoader: TextureLoader | null = null;
let mouseDownPosition: Vector2 | null = null;
let hasDragged = false;
let lastHoveredWallId: WallId | null = null;
let store: RootStore | null = null;

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

export function initScene(container: HTMLElement, rootStore: RootStore): void {
  store = rootStore;
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
  updateRoom(rootStore);

  // Subscribe to store changes
  autorun(() => {
    if (store) {
      updateRoom(store);
    }
  });

  // Subscribe to hover state changes
  autorun(() => {
    if (store) {
      updateHoverHighlight(store.wall.hoveredWallId);
    }
  });

  // Subscribe to selected wall changes for perimeter line
  autorun(() => {
    if (store) {
      updatePerimeterLine(store);
    }
  });

  // Track mouse down to detect drags
  container.addEventListener('mousedown', (event) => {
    mouseDownPosition = new Vector2(event.clientX, event.clientY);
    hasDragged = false;
  });

  // Track mouse move to detect if it's a drag and handle hover
  container.addEventListener('mousemove', (event) => {
    if (mouseDownPosition) {
      const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
      const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
      // If mouse moved more than 5 pixels, consider it a drag
      if (deltaX > 5 || deltaY > 5) {
        hasDragged = true;
      }
    }
    // Handle hover detection (only when not dragging)
    if (!mouseDownPosition && store) {
      handleHover(event, container, store);
    }
  });

  // Clear hover when mouse leaves canvas
  container.addEventListener('mouseleave', () => {
    if (store) {
      store.wall.setHoveredWall(null);
    }
    lastHoveredWallId = null;
    updateHoverHighlight(null);
  });

  // Mouse up handler - keep hasDragged flag until click event processes
  container.addEventListener('mouseup', () => {
    mouseDownPosition = null;
    // Don't reset hasDragged here - let click handler check it first
  });

  // Mouse click handler for wall selection (only if not a drag)
  container.addEventListener('click', (event) => {
    // Only handle click if we haven't dragged during this interaction
    if (!hasDragged && store) {
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
  wallOriginalMaterials.clear();

  // Clear existing perimeter lines
  perimeterLines.forEach((group) => {
    scene!.remove(group);
    // Dispose of all meshes in the group
    group.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  });
  perimeterLines.clear();

  const width = mmToMeters(store.room.width);
  const height = mmToMeters(store.room.height);
  const length = mmToMeters(store.room.length);

  // Create 6 walls
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfLength = length / 2;

  // Front wall (editable) - faces inward toward center (+Z direction)
  const frontPosition = new Vector3(0, 0, -halfLength);
  const frontRotation = new Vector3(0, 0, 0);
  createWall(
    'front',
    frontPosition,
    frontRotation,
    new Vector2(width, height),
    store.wall.wallConfigs.front,
    scene
  );
  createPerimeterLineForWall('front', frontPosition, frontRotation, new Vector2(width, height), scene);

  // Back wall (editable) - faces inward toward center (-Z direction)
  const backPosition = new Vector3(0, 0, halfLength);
  const backRotation = new Vector3(0, Math.PI, 0);
  createWall(
    'back',
    backPosition,
    backRotation,
    new Vector2(width, height),
    store.wall.wallConfigs.back,
    scene
  );
  createPerimeterLineForWall('back', backPosition, backRotation, new Vector2(width, height), scene);

  // Left wall (editable) - faces inward toward center (+X direction)
  const leftPosition = new Vector3(-halfWidth, 0, 0);
  const leftRotation = new Vector3(0, Math.PI / 2, 0);
  createWall(
    'left',
    leftPosition,
    leftRotation,
    new Vector2(length, height),
    store.wall.wallConfigs.left,
    scene
  );
  createPerimeterLineForWall('left', leftPosition, leftRotation, new Vector2(length, height), scene);

  // Right wall (editable) - faces inward toward center (-X direction)
  const rightPosition = new Vector3(halfWidth, 0, 0);
  const rightRotation = new Vector3(0, -Math.PI / 2, 0);
  createWall(
    'right',
    rightPosition,
    rightRotation,
    new Vector2(length, height),
    store.wall.wallConfigs.right,
    scene
  );
  createPerimeterLineForWall('right', rightPosition, rightRotation, new Vector2(length, height), scene);

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

  // Store original material for editable walls
  if (wallId !== 'top' && wallId !== 'bottom' && material instanceof MeshStandardMaterial) {
    wallOriginalMaterials.set(wallId, material);
  }
}

function createPerimeterLineForWall(
  wallId: WallId,
  position: Vector3,
  rotation: Vector3,
  size: Vector2,
  scene: Scene
): void {
  const group = createWallPerimeterLine(wallId, position, rotation, size);
  group.visible = false; // Hidden by default, shown when wall is selected
  scene.add(group);
  perimeterLines.set(wallId, group);
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

function handleHover(
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
    if (wallId && wallId !== lastHoveredWallId) {
      store.wall.setHoveredWall(wallId);
      lastHoveredWallId = wallId;
    }
  } else {
    if (lastHoveredWallId !== null) {
      store.wall.setHoveredWall(null);
      lastHoveredWallId = null;
    }
  }
}

function updateHoverHighlight(hoveredWallId: WallId | null): void {
  // Remove highlight from previously hovered wall
  wallMeshes.forEach((mesh, wallId) => {
    if (wallId !== 'top' && wallId !== 'bottom' && wallId !== hoveredWallId) {
      const originalMaterial = wallOriginalMaterials.get(wallId as WallId);
      if (originalMaterial && mesh.material !== originalMaterial) {
        // Restore original material
        if (mesh.material instanceof MeshStandardMaterial) {
          mesh.material.dispose();
        }
        mesh.material = originalMaterial;
      }
    }
  });

  // Apply highlight to hovered wall
  if (hoveredWallId) {
    const mesh = wallMeshes.get(hoveredWallId);
    const originalMaterial = wallOriginalMaterials.get(hoveredWallId);
    if (mesh && originalMaterial && mesh.material === originalMaterial) {
      // Clone material and apply emissive glow
      const hoverMaterial = originalMaterial.clone();
      hoverMaterial.emissive = new Color(0x4a90e2); // Light blue
      hoverMaterial.emissiveIntensity = 0.25;
      mesh.material = hoverMaterial;
    }
  }
}

function updatePerimeterLine(store: RootStore): void {
  const selectedWallId = store.wall.selectedWallId;
  
  perimeterLines.forEach((line, wallId) => {
    line.visible = wallId === selectedWallId;
  });
}

function animate(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  const render = (): void => {
    if (controls && renderer && scene && camera) {
      controls.update();
      
      // Animate perimeter line dash pattern - move dashes along the perimeter
      if (store) {
        const selectedWallId = store.wall.selectedWallId;
        if (selectedWallId) {
          const group = perimeterLines.get(selectedWallId);
          if (group && group.userData.perimeterLength) {
            const time = performance.now() * 0.001; // Convert to seconds
            const speed = 0.5; // meters per second
            const offset = (time * speed) % group.userData.perimeterLength;
            updatePerimeterLineAnimation(group, offset);
          }
        }
      }
      
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
  wallOriginalMaterials.clear();

  perimeterLines.forEach((group) => {
    // Dispose of all meshes in the group
    group.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  });
  perimeterLines.clear();

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
  raycaster = null;
  textureLoader = null;
  store = null;
  lastHoveredWallId = null;
}

