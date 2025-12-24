import { makeAutoObservable } from 'mobx';
import {
  type WallId,
  type TileConfig,
  type WallConfigs,
  DEFAULT_TILE_CONFIG,
} from '../types/wall.types';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../lib/storage';

export class WallModel {
  selectedWallId: WallId | null = null;
  hoveredWallId: WallId | null = null;
  wallConfigs: WallConfigs = {
    front: { ...DEFAULT_TILE_CONFIG },
    back: { ...DEFAULT_TILE_CONFIG },
    left: { ...DEFAULT_TILE_CONFIG },
    right: { ...DEFAULT_TILE_CONFIG },
  };

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  selectWall(wallId: WallId): void {
    this.selectedWallId = wallId;
    this.saveSelectedWall();
  }

  setHoveredWall(wallId: WallId | null): void {
    this.hoveredWallId = wallId;
  }

  deselectWall(): void {
    this.selectedWallId = null;
    this.saveSelectedWall();
  }

  updateWallConfig(wallId: WallId, config: Partial<TileConfig>): void {
    this.wallConfigs[wallId] = { ...this.wallConfigs[wallId], ...config };
    this.saveToStorage();
  }

  setTileImage(wallId: WallId, imageUrl: string | null): void {
    this.updateWallConfig(wallId, { imageUrl });
  }

  setTileSize(wallId: WallId, width: number, height: number): void {
    this.updateWallConfig(wallId, { tileWidth: width, tileHeight: height });
  }

  setSpacing(wallId: WallId, spacing: number): void {
    this.updateWallConfig(wallId, { spacing });
  }

  setGroutColor(wallId: WallId, color: string): void {
    this.updateWallConfig(wallId, { groutColor: color });
  }

  get selectedWallConfig(): TileConfig | null {
    if (this.selectedWallId === null) {
      return null;
    }
    return this.wallConfigs[this.selectedWallId];
  }

  loadFromStorage(): void {
    const storedConfigs = loadFromStorage<WallConfigs>(STORAGE_KEYS.WALLS);
    if (storedConfigs) {
      this.wallConfigs = storedConfigs;
    }

    const storedSelected = loadFromStorage<WallId | null>(
      STORAGE_KEYS.SELECTED_WALL
    );
    if (storedSelected !== null) {
      this.selectedWallId = storedSelected;
    }
  }

  saveToStorage(): void {
    saveToStorage<WallConfigs>(STORAGE_KEYS.WALLS, this.wallConfigs);
  }

  saveSelectedWall(): void {
    saveToStorage<WallId | null>(STORAGE_KEYS.SELECTED_WALL, this.selectedWallId);
  }
}

