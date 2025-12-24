import { RoomModel } from './room.model';
import { WallModel } from './wall.model';
import { SceneModel } from './scene.model';

export class RootStore {
  room: RoomModel;
  wall: WallModel;
  scene: SceneModel;

  constructor() {
    this.room = new RoomModel();
    this.wall = new WallModel();
    this.scene = new SceneModel();
  }
}

export const rootStore = new RootStore();

