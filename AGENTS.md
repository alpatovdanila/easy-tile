# Agent Development Guide

**Purpose**: This document provides comprehensive guidelines for AI agents working on this project. Reference this document when writing code, making architectural decisions, or implementing features.

---

## Project Overview

### Application Purpose
Web application to help customers visualize how decorative tiling would look in a room before purchase.

### Core Functionality
- **3D Visualization**: Browser viewport displays a 3D cube representing an abstract room
  - Camera is positioned at the center of the cube
  - Cube can be rotated around the camera using mouse drag
  - Clicking on a wall "selects" it for editing
- **Controls Panel** (top right corner, updates propagate immediately to 3D preview)
  - **Room Controls**: Adjust room dimensions (width, height, length)
  - **Wall Controls**
    - Image selector for tile texture/image
    - Tile size input (in mm)
    - Spacing between tiles input (in mm)
    - Color picker for grout/spacing color
- **Persistence**: All user changes are stored in local storage and persist between app launches

---

## Tech Stack

### Core Technologies
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D rendering engine
- **MobX** - State management
- **Vite** - Build tool and dev server

### Key Libraries (to be installed)
- `three` - Three.js core library
- `@react-three/fiber` - React renderer for Three.js (recommended for React integration)
- `@react-three/drei` - Useful helpers for React Three Fiber (optional but recommended)
- `mobx` - State management
- `mobx-react-lite` - React bindings for MobX

### When to Add Dependencies
- Only add third-party libraries for complex functionality (3D rendering, state management)
- Avoid libraries for simple tasks (use native APIs or self-contained utilities)
- Examples of what NOT to add: lodash (use native array/object methods), axios (use fetch), date-fns (use native Date or simple lib)

---

## Architecture & Code Style

### Code Style Principles
- **Avoid OOP**: Prefer functional programming and composition over inheritance
- **Modern JavaScript**: Use ESNext features (async/await, optional chaining, destructuring, etc.)
- **Descriptive Naming**: Use business-aware, descriptive variable and function names
- **TypeScript**: Leverage TypeScript for type safety. Strictly Avoid `any` types; use proper types or `unknown` when necessary
- **Minimal Dependencies**: Prefer native APIs and self-contained utilities over third-party libraries
- **No default exports**: Avoid default exports when possible and use explicit named exports instead

### Project Structure Guidelines

#### Directory Organization
```
src/
├── components/          # React components
│   ├── scene/          # 3D scene components (Three.js)
│   └── layout/         # Layout components
├── model/              # MobX stores
│   ├── room.model.ts   # Room dimensions state
│   ├── wall.model.ts   # Wall selection and tile configuration
│   └── scene.model.ts  # 3D scene state (camera, rotation, etc.)
├── lib/                # Self-contained utility libraries
│   ├── storage.ts      # Local storage helpers
│   ├── three.ts        # Three.js helpers/utilities
│   └── math.ts         # Math utilities
├── ui/                 # UI control components
└── types/              # Global TypeScript type definitions

```

#### File Organization Rules
- **Feature-oriented structure**: Group related files by feature/domain
- **Component subdirectories**: When creating new components, prefer subdirectories with barrel files (`index.ts`) over placing all components in one pile
- **Barrel exports**: Use `index.ts` files to export from subdirectories
- **No "utils" folder**: Use "lib" instead. Each file in lib is a separate library. Merge thematically related utilities into single files (e.g., `object.ts`, `array.ts`, `date.ts`)

#### Naming Conventions
- **Components**: PascalCase (e.g., `RoomControls.tsx`, `WallSelector.tsx`)
- **Stores**: camelCase with `.model.ts` suffix (e.g., `room.model.ts`, `wall.model.ts`)
- **Utilities**: camelCase (e.g., `storage.ts`, `three.ts`)
- **Types**: PascalCase (e.g., `RoomDimensions.ts`, `TileConfig.ts`)
- **Files**: Match the export (component files match component name)

### Separation of Concerns

#### Store and Business Logic
- **Isolation**: Keep store and business logic completely isolated from the view layer
- **Independence**: Store and view should be independently changeable without affecting each other
- **Store as Machine**: Treat store/business layer as a self-contained machine
- **View as Consumer**: View layer is a thin consumer and controller of the store
- **No View Dependencies**: Stores should not import React components or view-specific code

#### MobX Store Patterns
- Use MobX observables for reactive state
- Use actions for state mutations
- Use computed values for derived state
- Keep stores focused on single responsibilities
- Example structure:
```typescript
// store/room.store.ts
import { makeAutoObservable } from 'mobx';

export class RoomStore {
  width = 3000; // mm
  height = 2500; // mm
  length = 4000; // mm

  constructor() {
    makeAutoObservable(this);
  }

  setDimensions(width: number, height: number, length: number) {
    this.width = width;
    this.height = height;
    this.length = length;
  }
}
```

### Three.js Integration

#### Scene Setup
- Do not use any react integrations. Scene should be rendered in plain canvas on the page. React app with UI should be rendered in a plain absolutely positioned div placed over the 3d scene canvas

#### Performance Considerations
- Optimize texture loading and caching

#### Camera and Controls
- Camera positioned at cube center
- Implement orbit controls for rotation (consider `@react-three/drei` OrbitControls)
- Handle mouse drag events for rotation
- Implement raycasting for wall selection on click

---

## Implementation Details

### Local Storage Persistence
- Store all user configuration in `localStorage`
- Use a dedicated storage library in `lib/storage.ts`
- Store structure:
  - Room dimensions
  - Selected wall ID
  - Wall configurations (tile image, size, spacing, grout color)
- Implement storage on every state change (debounced if needed)
- Load stored state on app initialization

### State Management Structure

#### Room State
- Dimensions: width, height, length (in mm)
- Default values should be reasonable (e.g., 3000mm x 2500mm x 4000mm)

#### Wall State
- Selected wall ID (front, back, left, right, top, bottom)
- Per-wall configuration:
  - Tile image URL/path
  - Tile width and height (mm)
  - Spacing between tiles (mm)
  - Grout color (hex/rgb)

#### Scene State
- Camera position and rotation
- Mouse interaction state
- Render settings

### Component Structure

#### 3D Scene Component
- Main canvas container
- Room cube mesh
- Wall meshes with materials
- Camera setup
- Event handlers (click, drag)

#### Controls Component
- Room dimension inputs
- Wall selection UI
- Tile configuration inputs
- Color picker

---

## Development Workflow

### Feature Implementation
1. **MANDATORY: Create Feature Branch FIRST**: 
   - **ALWAYS** create a new git branch before starting any fix or feature work
   - Checkout a new git branch with descriptive feature name (e.g., `feature/wall-selection`, `feature/tile-configuration`, `fix/camera-rotation-bug`)
   - Use `feature/` prefix for new features and `fix/` prefix for bug fixes
   - Never make changes directly on master/main branch
2. **Test-Driven Development**: 
   - Write unit tests first when possible
   - If no existing tests, write tests before implementation
   - Verify old and new tests pass after implementation
3. **Implementation**: Follow architecture and code style guidelines
4. **Code Review**: Ensure code follows all guidelines
5. **MANDATORY: Commit Changes After Completion**:
   - After implementation is complete and accepted by the user, commit all changes
   - Use descriptive commit messages that clearly explain what was changed and why
   - Stage all relevant files (use `git add .` or specific files as appropriate)
   - Create commit with meaningful message (e.g., `git commit -m "feat: implement wall selection with click detection"` or `git commit -m "fix: resolve camera rotation jitter issue"`)
6. **Merge Request**: Create merge request to master branch after local approval

### Testing Strategy
- Unit tests for stores and business logic
- Component tests for React components
- Integration tests for user interactions

### Git Workflow
- **CRITICAL**: Always create a new branch before making any changes (fixes or features)
- Fix and Feature branches from master
- Descriptive commit messages following conventional commits format (feat:, fix:, refactor:, etc.)
- Commit changes after implementation is complete and accepted
- Merge requests for code review
- Keep commits focused and atomic

---

## Common Patterns & Examples

### MobX Store with Local Storage
```typescript
// store/room.store.ts
import { makeAutoObservable } from 'mobx';
import { loadFromStorage, saveToStorage } from '../lib/storage';

export class RoomStore {
  width = 3000;
  height = 2500;
  length = 4000;

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  setDimensions(width: number, height: number, length: number) {
    this.width = width;
    this.height = height;
    this.length = length;
    this.saveToStorage();
  }

  private loadFromStorage() {
    const stored = loadFromStorage('room');
    if (stored) {
      Object.assign(this, stored);
    }
  }

  private saveToStorage() {
    saveToStorage('room', {
      width: this.width,
      height: this.height,
      length: this.length,
    });
  }
}
```

### React Three Fiber Component
```typescript
// components/scene/Room.tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

export function Room({ width, height, length }: RoomProps) {
  const meshRef = useRef<Mesh>(null);

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[width, height, length]} />
      <meshStandardMaterial color="white" />
    </mesh>
  );
}
```

---

## Notes for Agents

- **Always reference this document** when making architectural decisions
- **MANDATORY: Create a branch first** - Never start implementing fixes or features without creating a new git branch first
- **MANDATORY: Commit after completion** - Always commit changes after implementation is complete and accepted by the user
- **Ask for clarification** if requirements are ambiguous
- **Follow the separation of concerns** strictly - don't mix store and view logic
- **Use TypeScript types** - avoid `any` unless absolutely necessary
- **Keep components small and focused** - single responsibility principle
- **Test your changes** - ensure the app still works after modifications
- **Consider performance** - especially for 3D rendering operations
