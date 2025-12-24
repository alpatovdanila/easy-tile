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

    // Invert direction: drag right rotates left, drag down rotates down (natural)
    rotationY -= deltaX * 0.005;
    rotationX += deltaY * 0.005; // Changed sign: drag down now rotates down
    
    // Clamp vertical rotation to avoid flipping
    rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

    // Preserve camera Y position (for camera height)
    const cameraY = camera.position.y;
    
    // Calculate look direction based on rotation
    const direction = new Vector3();
    direction.x = Math.sin(rotationY) * Math.cos(rotationX);
    direction.y = Math.sin(rotationX);
    direction.z = -Math.cos(rotationY) * Math.cos(rotationX);

    // Set camera position (preserve Y for height)
    camera.position.set(0, cameraY, 0);
    // Look at a point in the calculated direction from camera position
    const lookAtPoint = new Vector3(
      camera.position.x + direction.x,
      camera.position.y + direction.y,
      camera.position.z + direction.z
    );
    camera.lookAt(lookAtPoint);

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
  isHorizontalGeometry: boolean; // Whether the geometry was created as horizontal (wide) or vertical (tall)
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

  // Create dashes continuously along the entire perimeter
  // This ensures consistent spacing even around corners
  let currentPosition = 0;
  while (currentPosition < perimeterLength) {
    // Determine which edge we're on and calculate position
    let edge: 'top' | 'right' | 'bottom' | 'left';
    let meshX: number, meshY: number;
    let dashActualLength: number;
    let isHorizontal: boolean;

    if (currentPosition < size.x) {
      // Top edge (left to right)
      edge = 'top';
      isHorizontal = true;
      const x = currentPosition - size.x / 2;
      const dashEnd = Math.min(currentPosition + dashLength, size.x);
      dashActualLength = dashEnd - currentPosition;
      meshX = (x + (dashEnd - size.x / 2)) / 2;
      meshY = halfHeight;
    } else if (currentPosition < size.x + size.y) {
      // Right edge (top to bottom)
      edge = 'right';
      isHorizontal = false;
      const yOffset = currentPosition - size.x;
      const y = halfHeight - yOffset;
      const dashEnd = Math.min(currentPosition + dashLength, size.x + size.y);
      dashActualLength = dashEnd - currentPosition;
      meshX = halfWidth;
      meshY = (y + (halfHeight - (dashEnd - size.x))) / 2;
    } else if (currentPosition < 2 * size.x + size.y) {
      // Bottom edge (right to left)
      edge = 'bottom';
      isHorizontal = true;
      const xOffset = currentPosition - size.x - size.y;
      const x = halfWidth - xOffset;
      const dashEnd = Math.min(currentPosition + dashLength, 2 * size.x + size.y);
      dashActualLength = dashEnd - currentPosition;
      meshX = (x + (halfWidth - (dashEnd - size.x - size.y))) / 2;
      meshY = -halfHeight;
    } else {
      // Left edge (bottom to top)
      edge = 'left';
      isHorizontal = false;
      const yOffset = currentPosition - 2 * size.x - size.y;
      const y = -halfHeight + yOffset;
      const dashEnd = Math.min(currentPosition + dashLength, perimeterLength);
      dashActualLength = dashEnd - currentPosition;
      meshX = -halfWidth;
      meshY = (y + (-halfHeight + (dashEnd - 2 * size.x - size.y))) / 2;
    }

    if (dashActualLength > 0) {
      // Always create as horizontal geometry (wide X, thin Y)
      const geometry = new BoxGeometry(dashActualLength, lineThickness, lineThickness);
      const mesh = new Mesh(geometry, material);
      mesh.position.set(meshX, meshY, zOffset);
      mesh.rotation.z = isHorizontal ? 0 : Math.PI / 2;
      group.add(mesh);
      dashSegments.push({
        mesh,
        edge,
        basePosition: currentPosition,
        length: dashActualLength,
        isHorizontalGeometry: true,
      });
    }

    // Move to next dash position (dash + gap)
    currentPosition += segmentLength;
  }

  // Store animation data in group userData
  group.userData.dashSegments = dashSegments;
  group.userData.perimeterLength = perimeterLength;
  group.userData.size = size;
  group.userData.halfWidth = halfWidth;
  group.userData.halfHeight = halfHeight;
  group.userData.zOffset = zOffset;
  group.userData.segmentLength = segmentLength;
  group.userData.lineThickness = lineThickness;

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
    let currentEdge: 'top' | 'right' | 'bottom' | 'left';
    let meshX: number, meshY: number;

    if (position < size.x) {
      // Top edge (left to right) - horizontal
      currentEdge = 'top';
      meshX = position - size.x / 2;
      meshY = halfHeight;
    } else if (position < size.x + size.y) {
      // Right edge (top to bottom) - vertical
      currentEdge = 'right';
      meshX = halfWidth;
      meshY = halfHeight - (position - size.x);
    } else if (position < 2 * size.x + size.y) {
      // Bottom edge (right to left) - horizontal
      currentEdge = 'bottom';
      meshX = halfWidth - (position - size.x - size.y);
      meshY = -halfHeight;
    } else {
      // Left edge (bottom to top) - vertical
      currentEdge = 'left';
      meshX = -halfWidth;
      meshY = -halfHeight + (position - 2 * size.x - size.y);
    }

    // Update position
    segment.mesh.position.set(meshX, meshY, zOffset);

    // Update rotation based on current edge orientation
    // All geometries are created as horizontal (wide X, thin Y)
    // So we just need to rotate when on vertical edges
    const currentIsHorizontal = currentEdge === 'top' || currentEdge === 'bottom';

    if (currentIsHorizontal) {
      // Dash should be horizontal - no rotation needed
      segment.mesh.rotation.z = 0;
      segment.mesh.scale.set(1, 1, 1);
    } else {
      // Dash should be vertical - rotate 90 degrees
      // When we rotate horizontal geometry by π/2:
      // - X (wide) becomes -Y, Y (thin) becomes X
      // - So we get: thin in X, wide in -Y
      // - We want: thin in X, wide in Y
      // - The rotation gives us the right dimensions, just need to ensure scale is correct
      segment.mesh.rotation.z = Math.PI / 2;
      segment.mesh.scale.set(1, 1, 1);
    }

    // Update the stored edge for next frame
    segment.edge = currentEdge;
  });
}

