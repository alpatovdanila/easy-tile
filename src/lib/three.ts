/**
 * Three.js helper functions
 */
import {
  Camera,
  Raycaster,
  Vector2,
  Vector3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Group,
} from 'three';
import type { Intersection } from 'three';
import type { WallId } from '../types/wall.types';

// Simple orbit controls implementation
export interface OrbitControls {
  enableDamping: boolean;
  dampingFactor: number;
  rotateSpeed: number;
  minDistance: number;
  maxDistance: number;
  update: () => void;
  dispose: () => void;
}

export function createOrbitControls(
  camera: Camera,
  domElement: HTMLElement
): OrbitControls {
  let isDragging = false;
  let previousMousePosition = new Vector2();
  // Initialize rotation to look forward (toward -Z, which is the front wall)
  let rotationX = 0;
  let rotationY = 0;
  
  // Set initial camera direction
  const initialDirection = new Vector3(0, 0, -1);
  camera.position.set(0, 0, 0);
  camera.lookAt(initialDirection);

  const onMouseDown = (event: MouseEvent) => {
    isDragging = true;
    previousMousePosition.set(event.clientX, event.clientY);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Invert direction: drag right rotates left, drag down rotates up
    rotationY -= deltaX * 0.005;
    rotationX -= deltaY * 0.005;
    
    // Clamp vertical rotation to avoid flipping
    rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

    // Camera stays at center, calculate look direction based on rotation
    const direction = new Vector3();
    direction.x = Math.sin(rotationY) * Math.cos(rotationX);
    direction.y = Math.sin(rotationX);
    direction.z = -Math.cos(rotationY) * Math.cos(rotationX);

    // Set camera to look in the calculated direction from center
    camera.position.set(0, 0, 0);
    camera.lookAt(direction);

    previousMousePosition.set(event.clientX, event.clientY);
  };

  const onMouseUp = () => {
    isDragging = false;
  };

  domElement.addEventListener('mousedown', onMouseDown);
  domElement.addEventListener('mousemove', onMouseMove);
  domElement.addEventListener('mouseup', onMouseUp);
  domElement.addEventListener('mouseleave', onMouseUp);

  return {
    enableDamping: false,
    dampingFactor: 0.05,
    rotateSpeed: 1.0,
    minDistance: 1,
    maxDistance: 100,
    update: () => {
      // Update logic if needed
    },
    dispose: () => {
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('mouseleave', onMouseUp);
    },
  };
}

export function createRaycaster(_camera: Camera): Raycaster {
  return new Raycaster();
}

export function getWallIdFromIntersection(
  intersection: Intersection
): WallId | null {
  const wallId = intersection.object.userData?.wallId;
  if (typeof wallId === 'string') {
    const validWallIds: WallId[] = ['front', 'back', 'left', 'right'];
    if (validWallIds.includes(wallId as WallId)) {
      return wallId as WallId;
    }
  }
  return null;
}

export function mmToMeters(mm: number): number {
  return mm / 1000;
}

export function metersToMm(meters: number): number {
  return meters * 1000;
}

/**
 * Create a thick dashed perimeter border for a wall using geometry
 * @param _wallId - The wall identifier (unused, kept for API consistency)
 * @param position - Wall center position
 * @param rotation - Wall rotation (Euler angles)
 * @param size - Wall dimensions (width, height)
 * @returns A Group containing the perimeter border meshes
 */
export function createWallPerimeterLine(
  _wallId: WallId,
  position: Vector3,
  rotation: Vector3,
  size: Vector2
): Group {
  const halfWidth = size.x / 2;
  const halfHeight = size.y / 2;
  const offset = 0.01; // Offset to prevent z-fighting (increased for visibility)
  const lineThickness = 0.02; // 2cm thick line
  const dashLength = 0.15; // 15cm dash length
  const gapLength = 0.08; // 8cm gap length
  const segmentLength = dashLength + gapLength;

  const group = new Group();
  const material = new MeshBasicMaterial({
    color: 0xff6b6b, // Bright accent color
  });

  // Create dashed segments for each edge
  // Top edge
  const topEdgeLength = size.x;
  const topSegments = Math.ceil(topEdgeLength / segmentLength);
  for (let i = 0; i < topSegments; i++) {
    const startX = -halfWidth + i * segmentLength;
    const endX = Math.min(startX + dashLength, halfWidth);
    if (startX >= halfWidth) break;
    
    const dashWidth = endX - startX;
    if (dashWidth > 0) {
      const geometry = new BoxGeometry(dashWidth, lineThickness, lineThickness);
      const mesh = new Mesh(geometry, material);
      mesh.position.set((startX + endX) / 2, halfHeight, offset);
      group.add(mesh);
    }
  }

  // Bottom edge
  const bottomEdgeLength = size.x;
  const bottomSegments = Math.ceil(bottomEdgeLength / segmentLength);
  for (let i = 0; i < bottomSegments; i++) {
    const startX = -halfWidth + i * segmentLength;
    const endX = Math.min(startX + dashLength, halfWidth);
    if (startX >= halfWidth) break;
    
    const dashWidth = endX - startX;
    if (dashWidth > 0) {
      const geometry = new BoxGeometry(dashWidth, lineThickness, lineThickness);
      const mesh = new Mesh(geometry, material);
      mesh.position.set((startX + endX) / 2, -halfHeight, offset);
      group.add(mesh);
    }
  }

  // Left edge
  const leftEdgeLength = size.y;
  const leftSegments = Math.ceil(leftEdgeLength / segmentLength);
  for (let i = 0; i < leftSegments; i++) {
    const startY = -halfHeight + i * segmentLength;
    const endY = Math.min(startY + dashLength, halfHeight);
    if (startY >= halfHeight) break;
    
    const dashHeight = endY - startY;
    if (dashHeight > 0) {
      const geometry = new BoxGeometry(lineThickness, dashHeight, lineThickness);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(-halfWidth, (startY + endY) / 2, offset);
      group.add(mesh);
    }
  }

  // Right edge
  const rightEdgeLength = size.y;
  const rightSegments = Math.ceil(rightEdgeLength / segmentLength);
  for (let i = 0; i < rightSegments; i++) {
    const startY = -halfHeight + i * segmentLength;
    const endY = Math.min(startY + dashLength, halfHeight);
    if (startY >= halfHeight) break;
    
    const dashHeight = endY - startY;
    if (dashHeight > 0) {
      const geometry = new BoxGeometry(lineThickness, dashHeight, lineThickness);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(halfWidth, (startY + endY) / 2, offset);
      group.add(mesh);
    }
  }

  // Apply wall's transform to the group
  group.position.copy(position);
  group.rotation.set(rotation.x, rotation.y, rotation.z);

  return group;
}

