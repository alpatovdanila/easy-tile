# Technical Specification - MVP Implementation

**Version**: 1.0  
**Date**: 2025
**Status**: Ready for Implementation

---

## Overview

This document outlines the technical specification for implementing the Minimum Viable Product (MVP) of the Easy Tile visualization application. The MVP will include core 3D visualization, basic controls, and local storage persistence.

---

## Phase 1: Project Setup & Dependencies

### 1.1 Install Dependencies

Install the following production dependencies:

```bash
npm install three mobx mobx-react-lite
```

Install TypeScript types for Three.js:

```bash
npm install --save-dev @types/three
```

**Dependencies Summary**:
- `three` - Three.js 3D library (no React wrapper, plain Three.js)
- `mobx` - State management
- `mobx-react-lite` - React bindings for MobX
- `@types/three` - TypeScript definitions for Three.js

### 1.2 Project Structure

Create the following directory structure:

```
src/
├── model/
│   ├── room.model.ts             # Room dimensions store
│   ├── wall.model.ts             # Wall selection and tile config store
│   ├── scene.model.ts            # 3D scene state (camera, rotation)
│   └── index.ts                  # Barrel export (root store)
├── components/
│   └── scene.ts                  # Three.js scene initialization (standalone, NOT React component)
├── lib/
│   ├── storage.ts                # Local storage utilities
│   ├── three.ts                  # Three.js helper functions
│   └── math.ts                   # Math utilities (conversions, etc.)
├── ui/
│   ├── RoomControls.tsx          # Room dimension inputs
│   ├── WallControls.tsx          # Wall tile configuration inputs
│   ├── ColorPicker.tsx           # Color picker component
│   └── index.ts                 # Barrel export
├── types/
│   ├── room.types.ts             # Room-related types
│   ├── wall.types.ts             # Wall-related types
│   ├── scene.types.ts            # Scene-related types
│   └── index.ts                  # Barrel export
├── App.tsx                       # Root React component
└── main.tsx                      # Entry point
```

---

## Phase 2: Core Libraries & Utilities

### 2.1 Local Storage Library (`lib/storage.ts`)

**Purpose**: Abstract localStorage operations with type safety and error handling.

**Functions**:
- `saveToStorage<T>(key: string, data: T): void` - Save data to localStorage
- `loadFromStorage<T>(key: string): T | null` - Load data from localStorage
- `removeFromStorage(key: string): void` - Remove data from localStorage
- `clearStorage(): void` - Clear all app data

**Storage Keys**:
- `'easy-tile:room'` - Room dimensions
- `'easy-tile:walls'` - Wall configurations
- `'easy-tile:scene'` - Scene state (camera, rotation)
- `'easy-tile:selected-wall'` - Currently selected wall ID

**Implementation Notes**:
- Use JSON.stringify/parse with error handling
- Handle localStorage quota exceeded errors gracefully
- Return null if data doesn't exist or is invalid

### 2.2 Three.js Utilities (`lib/three.ts`)

**Purpose**: Helper functions for Three.js operations.

**Functions**:
- `createOrbitControls(camera: Camera, domElement: HTMLElement): OrbitControls` - Create orbit controls
- `createRaycaster(camera: Camera): Raycaster` - Create raycaster for wall selection
- `getWallIdFromIntersection(intersection: Intersection): WallId | null` - Extract wall ID from raycast intersection (only returns editable walls)
- `mmToMeters(mm: number): number` - Convert millimeters to meters for Three.js
- `metersToMm(meters: number): number` - Convert meters to millimeters

**Vector Types**:
- Use Three.js `Vector2` and `Vector3` for all coordinate operations
- Import from `three` package: `import { Vector2, Vector3 } from 'three'`
- Use Vector2 for 2D coordinates (screen space, UV coordinates)
- Use Vector3 for 3D coordinates (positions, rotations, directions)

**Implementation Notes**:
- Three.js uses meters, but UI uses millimeters
- Need custom orbit controls or use a lightweight implementation
- Raycasting should identify which wall face was clicked (only editable walls)
- Always use Vector2/Vector3 instead of plain arrays for coordinates

### 2.3 Math Utilities (`lib/math.ts`)

**Purpose**: Mathematical utilities for tile calculations.

**Functions**:
- `calculateTileCount(roomDimension: number, tileSize: number, spacing: number): number` - Calculate number of tiles that fit
- `clamp(value: number, min: number, max: number): number` - Clamp value between min and max
- `hexToRgb(hex: string): { r: number; g: number; b: number } | null` - Convert hex to RGB
- `rgbToHex(r: number, g: number, b: number): string` - Convert RGB to hex

---

## Phase 3: Type Definitions

### 3.1 Room Types (`types/room.types.ts`)

```typescript
export type RoomDimensions = {
  width: number;   // mm
  height: number;  // mm
  length: number;  // mm
};

export const DEFAULT_ROOM_DIMENSIONS: RoomDimensions = {
  width: 3000,
  height: 2500,
  length: 4000,
};
```

### 3.2 Wall Types (`types/wall.types.ts`)

```typescript
// Only 4 walls are editable (ceiling and floor are not editable)
export type WallId = 'front' | 'back' | 'left' | 'right';

export type TileConfig = {
  imageUrl: string | null;
  tileWidth: number;   // mm
  tileHeight: number;  // mm
  spacing: number;     // mm
  groutColor: string;  // hex color
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
```

### 3.3 Scene Types (`types/scene.types.ts`)

```typescript
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
```

---

## Phase 4: MobX Stores

### 4.1 Room Model (`model/room.model.ts`)

**Responsibilities**:
- Manage room dimensions (width, height, length in mm)
- Persist to localStorage on changes
- Load from localStorage on initialization

**Properties**:
- `width: number` (observable)
- `height: number` (observable)
- `length: number` (observable)

**Actions**:
- `setDimensions(width: number, height: number, length: number): void`
- `setWidth(width: number): void`
- `setHeight(height: number): void`
- `setLength(length: number): void`

**Methods**:
- `loadFromStorage(): void` - Load from localStorage
- `saveToStorage(): void` - Save to localStorage

**Default Values**: 3000mm x 2500mm x 4000mm

### 4.2 Wall Model (`model/wall.model.ts`)

**Responsibilities**:
- Manage selected wall ID
- Manage tile configurations for each wall
- Persist to localStorage on changes
- Load from localStorage on initialization

**Properties**:
- `selectedWallId: WallId | null` (observable)
- `wallConfigs: WallConfigs` (observable)

**Actions**:
- `selectWall(wallId: WallId): void`
- `updateWallConfig(wallId: WallId, config: Partial<TileConfig>): void`
- `setTileImage(wallId: WallId, imageUrl: string | null): void`
- `setTileSize(wallId: WallId, width: number, height: number): void`
- `setSpacing(wallId: WallId, spacing: number): void`
- `setGroutColor(wallId: WallId, color: string): void`

**Computed**:
- `selectedWallConfig: TileConfig | null` - Get config for selected wall

**Methods**:
- `loadFromStorage(): void`
- `saveToStorage(): void`

**Default Values**: All walls use `DEFAULT_TILE_CONFIG`

### 4.3 Scene Model (`model/scene.model.ts`)

**Responsibilities**:
- Manage 3D scene state (camera, rotation, interaction)
- Handle mouse drag state
- Persist camera position/rotation (optional for MVP)

**Properties**:
- `isDragging: boolean` (observable)
- `rotationX: number` (observable)
- `rotationY: number` (observable)

**Actions**:
- `startDrag(): void`
- `endDrag(): void`
- `updateRotation(x: number, y: number): void`
- `resetRotation(): void`

**Methods**:
- `loadFromStorage(): void` (optional for MVP)
- `saveToStorage(): void` (optional for MVP)

### 4.4 Root Store (`model/index.ts`)

**Purpose**: Create and export a root store instance that combines all models.

```typescript
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
```

---

## Phase 5: React Components

### 5.1 App Layout (`components/layout/AppLayout.tsx`)

**Purpose**: Main layout component that positions 3D canvas and UI overlay.

**Structure**:
- Full viewport container with two separate divs:
  - `div#scene` - Container for Three.js canvas (NOT part of React tree)
  - `div#ui` - Container for React UI components (absolutely positioned overlay)

**Props**: None (uses rootStore via context or direct import)

**Implementation**:
- **CRITICAL**: 3D scene must NOT be part of React tree
- Create `div#scene` element in DOM (via ref or direct DOM manipulation)
- Create `div#ui` element for React app
- Use CSS to position elements:
  - `#scene` - Full viewport, z-index: 0
  - `#ui` - Position absolute, top-right, z-index: 10, full viewport overlay
- Three.js renderer should mount to `div#scene`
- React app should mount to `div#ui`
- Both divs should be siblings in the DOM, not nested

### 5.2 3D Scene Initialization (`components/scene.ts`)

**Purpose**: Initialize and manage Three.js scene, camera, renderer, and controls. This is NOT a React component.

**Responsibilities**:
- Initialize Three.js scene, camera, renderer
- Mount renderer to `div#scene` element (NOT React tree)
- Set up orbit controls for rotation
- Handle window resize
- Render loop (requestAnimationFrame)
- Mouse event handlers (drag, click)
- Raycasting for wall selection (only editable walls)
- Subscribe to MobX stores for reactive updates

**Implementation Details**:
- **Standalone script**: This should be a plain TypeScript module, not a React component
- Camera: PerspectiveCamera at center (0, 0, 0) - use Vector3 for position
- Renderer: WebGLRenderer mounted to `div#scene` element
- Controls: Custom orbit controls or lightweight implementation
- Event listeners: Attach to `div#scene` element (mousedown, mousemove, mouseup, click)
- Raycasting on click to detect wall selection (only returns editable walls: front, back, left, right)
- Use Vector2 for mouse coordinates, Vector3 for 3D positions
- Subscribe to MobX stores using `autorun` or `reaction` for reactive updates

**File Structure**:
- Create `components/scene.ts` as standalone module (NOT a React component)
- Initialize in `main.tsx` after DOM is ready
- Import rootStore to access MobX stores

### 5.3 Room Rendering (in `components/scene.ts`)

**Purpose**: Render the room as a cube with 6 walls (4 editable + 2 non-editable).

**Implementation**:
- Create 6 separate wall meshes (not a single box geometry)
- 4 editable walls: front, back, left, right (selectable, configurable)
- 2 non-editable walls: top (ceiling), bottom (floor) - use default materials
- Only editable walls should be selectable via raycasting

**Parameters**:
- `width: number` - Room width in mm
- `height: number` - Room height in mm
- `length: number` - Room length in mm
- `wallConfigs: WallConfigs` - Configurations for editable walls only

**Implementation Details**:
- Convert mm to meters for Three.js
- Create 6 plane geometries for walls
- Position walls to form a cube using Vector3 for positions
- Apply textures/materials from wall configs for editable walls
- Apply default materials for ceiling and floor
- Each editable wall should have a unique identifier (userData.wallId) for raycasting
- Use Vector3 for all position calculations

### 5.4 Wall Rendering (in `components/scene.ts`)

**Purpose**: Render a single wall with tiling pattern.

**Parameters**:
- `wallId: WallId | 'top' | 'bottom'` - Which wall this is
- `config: TileConfig | null` - Tile configuration (null for non-editable walls)
- `position: Vector3` - Position in 3D space
- `rotation: Vector3` - Rotation in 3D space
- `size: Vector2` - Wall dimensions [width, height] in meters

**Implementation Details**:
- Create plane geometry with appropriate size
- Apply texture if imageUrl is provided (for editable walls)
- Use default material for non-editable walls (ceiling/floor)
- Use shader or texture repetition for tile pattern
- Apply grout color for spacing
- Store wallId in mesh.userData for raycasting identification
- Use Vector2 for 2D dimensions, Vector3 for 3D positions/rotations
- For MVP: Simple texture with repetition (advanced tiling pattern can be Phase 2)

### 5.5 Room Controls (`ui/RoomControls.tsx`)

**Purpose**: UI inputs for adjusting room dimensions.

**Components**:
- Three number inputs: Width, Height, Length (in mm)
- Labels for each input
- Real-time updates to store

**Props**:
- `roomStore: RoomModel` - Room store instance

**Implementation**:
- Use controlled inputs bound to store values
- Update store on change (debounced or immediate)
- Format: Number inputs with mm labels

### 5.6 Wall Controls (`ui/WallControls.tsx`)

**Purpose**: UI inputs for configuring selected wall's tiles.

**Components**:
- File input or URL input for tile image
- Number inputs: Tile Width, Tile Height (mm)
- Number input: Spacing (mm)
- Color picker: Grout color
- Display selected wall indicator

**Props**:
- `wallStore: WallModel` - Wall store instance

**Implementation**:
- Only show when a wall is selected
- Bind to selected wall's configuration
- Update store on change
- Image input: File picker or URL input (start with URL for MVP)

### 5.7 Color Picker (`ui/ColorPicker.tsx`)

**Purpose**: Simple color picker component.

**Implementation**:
- Use native HTML5 color input
- Display current color
- Call onChange callback with hex color

**Props**:
- `value: string` - Current color (hex)
- `onChange: (color: string) => void` - Change handler
- `label?: string` - Optional label

---

## Phase 6: Integration & App Setup

### 6.1 Root App Component (`App.tsx`)

**Purpose**: Main React component that sets up the UI (rendered in `div#ui`).

**Structure**:
- Provider for MobX store (if using context, or direct import)
- UI components (RoomControls, WallControls)
- Initialize stores and load from localStorage

**Implementation**:
```typescript
import { observer } from 'mobx-react-lite';
import { rootStore } from './model';
import { RoomControls } from './ui/RoomControls';
import { WallControls } from './ui/WallControls';

export const App = observer(() => {
  return (
    <div className="ui-overlay">
      <div className="controls-panel">
        <RoomControls roomStore={rootStore.room} />
        <WallControls wallStore={rootStore.wall} />
      </div>
    </div>
  );
});
```

### 6.2 Entry Point (`main.tsx`)

**Purpose**: Initialize both React app (UI) and Three.js scene separately.

**Implementation**:
```typescript
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { rootStore } from './model';
import { initScene } from './components/scene';

// Ensure stores are initialized and loaded
rootStore.room.loadFromStorage();
rootStore.wall.loadFromStorage();
rootStore.scene.loadFromStorage();

// Create div#scene and div#ui if they don't exist
const root = document.getElementById('root');
if (root) {
  // Create scene container (NOT part of React tree)
  const sceneDiv = document.createElement('div');
  sceneDiv.id = 'scene';
  root.appendChild(sceneDiv);

  // Create UI container (for React)
  const uiDiv = document.createElement('div');
  uiDiv.id = 'ui';
  root.appendChild(uiDiv);

  // Initialize Three.js scene (standalone, not React)
  initScene(sceneDiv, rootStore);

  // Render React app to UI div
  const reactRoot = createRoot(uiDiv);
  reactRoot.render(<App />);
}
```

**Critical Points**:
- `div#scene` and `div#ui` are siblings, both children of `#root`
- Three.js scene is initialized separately, not through React
- React app is rendered only to `div#ui`
- Both containers are positioned with CSS (see 6.3)

### 6.3 CSS Styling

**Requirements**:
- Full viewport layout
- Scene container should be fullscreen
- UI container should overlay on top
- Modern, clean design
- Responsive (optional for MVP)

**Key Styles**:
```css
#root {
  position: relative;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#scene {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

#ui {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none; /* Allow clicks to pass through to scene */
}

.ui-overlay {
  position: absolute;
  top: 0;
  right: 0;
  padding: 1rem;
  pointer-events: auto; /* Re-enable pointer events for UI */
}

.controls-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 300px;
}
```

---

## Phase 7: Implementation Checklist

### Setup & Infrastructure
- [ ] Install dependencies (three, mobx, mobx-react-lite, @types/three)
- [ ] Create directory structure
- [ ] Set up TypeScript configuration (if needed)

### Libraries & Utilities
- [ ] Implement `lib/storage.ts` with all functions
- [ ] Implement `lib/three.ts` with helper functions
- [ ] Implement `lib/math.ts` with utility functions

### Type Definitions
- [ ] Create `types/room.types.ts`
- [ ] Create `types/wall.types.ts`
- [ ] Create `types/scene.types.ts`
- [ ] Create `types/index.ts` barrel export

### MobX Stores
- [ ] Implement `model/room.model.ts`
- [ ] Implement `model/wall.model.ts`
- [ ] Implement `model/scene.model.ts`
- [ ] Create `model/index.ts` root store
- [ ] Test store persistence (localStorage)

### React Components
- [ ] Implement `ui/RoomControls.tsx`
- [ ] Implement `ui/WallControls.tsx`
- [ ] Implement `ui/ColorPicker.tsx`
- [ ] Create barrel exports for UI components

### Three.js Scene (Standalone)
- [ ] Implement `components/scene.ts` - Three.js scene initialization (standalone module, NOT React component)
- [ ] Implement room rendering with 4 editable walls + 2 non-editable walls
- [ ] Implement wall rendering with Vector2/Vector3 for coordinates
- [ ] Implement raycasting (only for editable walls)
- [ ] Implement orbit controls
- [ ] Connect to MobX stores for reactive updates

### Integration
- [ ] Update `App.tsx` to render UI components only
- [ ] Update `main.tsx` to create `div#scene` and `div#ui` separately
- [ ] Initialize Three.js scene in `main.tsx` (standalone, not React)
- [ ] Add CSS styling for scene and UI containers
- [ ] Test full application flow
- [ ] Verify 3D scene is NOT in React tree
- [ ] Verify only 4 walls are editable (ceiling/floor not selectable)

### Testing & Validation
- [ ] Test room dimension changes update 3D view
- [ ] Test wall selection via click
- [ ] Test tile configuration updates
- [ ] Test local storage persistence
- [ ] Test app reload restores state
- [ ] Test camera rotation with mouse drag

---

## Phase 8: MVP Features Summary

### Core Features (Must Have)
1. ✅ 3D room visualization (cube with 6 walls)
2. ✅ Only 4 walls editable (front, back, left, right) - ceiling and floor not editable
3. ✅ Camera rotation with mouse drag
4. ✅ Wall selection via click (only editable walls)
5. ✅ Room dimension controls
6. ✅ Wall tile configuration controls (only for selected editable wall)
7. ✅ Local storage persistence
8. ✅ State restoration on page reload
9. ✅ 3D scene rendered separately from React tree (div#scene and div#ui)
10. ✅ Use Vector2 and Vector3 for all coordinate operations

### Nice to Have (Can be Phase 2)
- Advanced tile pattern rendering (grout lines, proper tiling)
- Texture loading from file upload
- Multiple texture support
- Camera reset button
- Room preset dimensions
- Export/import configuration

---

## Technical Considerations

### Three.js Setup
- Use plain Three.js (no React Three Fiber, no React integration)
- Scene rendered to `div#scene` which is NOT part of React tree
- Canvas element created and managed directly in standalone module
- Render loop in standalone module (not React lifecycle)
- Clean up on page unload (remove event listeners, dispose geometries)
- Use Vector2 and Vector3 from Three.js for all coordinate operations

### Performance
- Debounce localStorage writes (optional)
- Optimize render loop (only render on changes)
- Dispose unused textures and geometries
- Consider instanced rendering for tiles (Phase 2)

### Browser Compatibility
- WebGL support required
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile support optional for MVP

### Error Handling
- Handle WebGL context loss
- Handle invalid localStorage data
- Handle texture loading errors
- Graceful degradation for unsupported features

---

## Next Steps After MVP

1. **Advanced Tiling**: Implement proper tile pattern with grout lines
2. **File Upload**: Support image file upload for tiles
3. **Multiple Textures**: Allow different textures per wall
4. **Export/Import**: Save and load configurations
5. **Presets**: Room dimension presets
6. **Animations**: Smooth transitions for dimension changes
7. **Performance**: Optimize rendering for large rooms
8. **Testing**: Add unit and integration tests

---

## Notes for Implementation

- Follow AGENTS.md guidelines strictly
- Use TypeScript types throughout (no `any`)
- Keep components small and focused
- Test each phase before moving to next
- Commit frequently with descriptive messages
- Reference this spec when implementing each component

