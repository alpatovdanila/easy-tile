import { Vector3 } from 'three';

export type SceneState = {
  cameraPosition: Vector3;
  cameraRotation: Vector3;
  isDragging: boolean;
};

export const DEFAULT_SCENE_STATE: SceneState = {
  cameraPosition: new Vector3(0, 0, 0),
  cameraRotation: new Vector3(0, 0, 0),
  isDragging: false,
};

