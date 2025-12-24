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

interface DashSegment {
  mesh: Mesh;
  edge: 'top' | 'bottom' | 'left' | 'right';
  basePosition: number; // Position along the edge
  length: number; // Dash length
}

/**
 * Create a thick dashed perimeter border for a wall using geometry
 * @param _wallId - The wall identifier (unused, kept for API consistency)
 * @param position - Wall center position
 * @param rotation - Wall rotation (Euler angles)
 * @param size - Wall dimensions (width, height)
 * @returns A Group containing the perimeter border meshes with animation data
 */
export function createWallPerimeterLine(
  _wallId: WallId,
  position: Vector3,
  rotation: Vector3,
  size: Vector2
): Group {
  const halfWidth = size.x / 2;
  const halfHeight = size.y / 2;
  const zOffset = 0.01; // Offset to prevent z-fighting (increased for visibility)
  const lineThickness = 0.02; // 2cm thick line
  const dashLength = 0.15; // 15cm dash length
  const gapLength = 0.08; // 8cm gap length
  const segmentLength = dashLength + gapLength;

  const group = new Group();
  const material = new MeshBasicMaterial({
    color: 0xff6b6b, // Bright accent color
  });

  const dashSegments: DashSegment[] = [];
  const perimeterLength = 2 * (size.x + size.y);

  // Create dashed segments for each edge and store their metadata
  // Top edge (left to right)
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
      const basePosition = startX + halfWidth; // Position along top edge (0 to width)
      mesh.position.set((startX + endX) / 2, halfHeight, zOffset);
      group.add(mesh);
      dashSegments.push({
        mesh,
        edge: 'top',
        basePosition,
        length: dashWidth,
      });
    }
  }

  // Right edge (top to bottom)
  const rightEdgeLength = size.y;
  const rightSegments = Math.ceil(rightEdgeLength / segmentLength);
  for (let i = 0; i < rightSegments; i++) {
    const startY = halfHeight - i * segmentLength;
    const endY = Math.max(startY - dashLength, -halfHeight);
    if (startY <= -halfHeight) break;
    
    const dashHeight = startY - endY;
    if (dashHeight > 0) {
      const geometry = new BoxGeometry(lineThickness, dashHeight, lineThickness);
      const mesh = new Mesh(geometry, material);
      const basePosition = size.x + (halfHeight - startY); // Position along perimeter
      mesh.position.set(halfWidth, (startY + endY) / 2, zOffset);
      group.add(mesh);
      dashSegments.push({
        mesh,
        edge: 'right',
        basePosition,
        length: dashHeight,
      });
    }
  }

  // Bottom edge (right to left)
  const bottomEdgeLength = size.x;
  const bottomSegments = Math.ceil(bottomEdgeLength / segmentLength);
  for (let i = 0; i < bottomSegments; i++) {
    const startX = halfWidth - i * segmentLength;
    const endX = Math.max(startX - dashLength, -halfWidth);
    if (startX <= -halfWidth) break;
    
    const dashWidth = startX - endX;
    if (dashWidth > 0) {
      const geometry = new BoxGeometry(dashWidth, lineThickness, lineThickness);
      const mesh = new Mesh(geometry, material);
      const basePosition = size.x + size.y + (halfWidth - startX); // Position along perimeter
      mesh.position.set((startX + endX) / 2, -halfHeight, zOffset);
      group.add(mesh);
      dashSegments.push({
        mesh,
        edge: 'bottom',
        basePosition,
        length: dashWidth,
      });
    }
  }

  // Left edge (bottom to top)
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
      const basePosition = 2 * size.x + size.y + (startY + halfHeight); // Position along perimeter
      mesh.position.set(-halfWidth, (startY + endY) / 2, zOffset);
      group.add(mesh);
      dashSegments.push({
        mesh,
        edge: 'left',
        basePosition,
        length: dashHeight,
      });
    }
  }

  // Store animation data in group userData
  group.userData.dashSegments = dashSegments;
  group.userData.perimeterLength = perimeterLength;
  group.userData.size = size;
  group.userData.halfWidth = halfWidth;
  group.userData.halfHeight = halfHeight;
  group.userData.zOffset = zOffset;
  group.userData.segmentLength = segmentLength;

  // Apply wall's transform to the group
  group.position.copy(position);
  group.rotation.set(rotation.x, rotation.y, rotation.z);

  return group;
}

/**
 * Update dash positions to create a moving animation along the perimeter
 * @param group - The perimeter line group
 * @param offset - Offset along the perimeter (0 to perimeterLength)
 */
export function updatePerimeterLineAnimation(group: Group, offset: number): void {
  const { dashSegments, perimeterLength, size, halfWidth, halfHeight, zOffset } = group.userData;
  if (!dashSegments) return;

  dashSegments.forEach((segment: DashSegment) => {
    let position = (segment.basePosition + offset) % perimeterLength;

    // Determine which edge the dash should be on based on position
    if (position < size.x) {
      // Top edge (left to right)
      const x = position - size.x / 2;
      segment.mesh.position.set(x, halfHeight, zOffset);
    } else if (position < size.x + size.y) {
      // Right edge (top to bottom)
      const y = halfHeight - (position - size.x);
      segment.mesh.position.set(halfWidth, y, zOffset);
    } else if (position < 2 * size.x + size.y) {
      // Bottom edge (right to left)
      const x = halfWidth - (position - size.x - size.y);
      segment.mesh.position.set(x, -halfHeight, zOffset);
    } else {
      // Left edge (bottom to top)
      const y = -halfHeight + (position - 2 * size.x - size.y);
      segment.mesh.position.set(-halfWidth, y, zOffset);
    }
  });
}

