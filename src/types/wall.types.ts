// Only 4 walls are editable (ceiling and floor are not editable)
export type WallId = 'front' | 'back' | 'left' | 'right';

export type TileConfig = {
  imageUrl: string | null;
  tileWidth: number; // mm
  tileHeight: number; // mm
  spacing: number; // mm
  groutColor: string; // hex color
};

export type WallConfigs = {
  [K in WallId]: TileConfig;
};

// Note: Ceiling and floor are rendered but not editable
// They use default materials and are not included in WallConfigs

export const DEFAULT_TILE_CONFIG: TileConfig = {
  imageUrl: null,
  tileWidth: 300,
  tileHeight: 300,
  spacing: 3,
  groutColor: '#cccccc',
};

