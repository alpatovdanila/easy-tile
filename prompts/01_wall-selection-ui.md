# Technical Specification: Wall Selection UI

## Overview

This document specifies the implementation of enhanced wall selection UI features, including hover highlighting, selected wall perimeter indication, and deselection capability.

## Requirements

### Functional Requirements

1. **Hover Highlighting**
   - When the mouse hovers over an editable wall (front, back, left, right), the wall should be visually highlighted
   - Highlighting should be immediate and responsive
   - Highlighting should not interfere with wall selection or camera rotation
   - Only editable walls should show hover effects (not ceiling/floor)

2. **Selected Wall Perimeter Indication**
   - When a wall is selected, display a running dashed line along its perimeter
   - The dashed line should animate (appear to "run" along the perimeter)
   - The line should be clearly visible against the wall surface
   - The line should update when room dimensions change

3. **Deselection UI**
   - Add a button/control in the `WallControls` component to deselect the currently selected wall
   - Deselection should clear the selected wall state
   - After deselection, the wall configuration panel should show the "Click on a wall" message

### Non-Functional Requirements

- Performance: Hover detection should not impact frame rate
- Visual clarity: Highlighting and selection indicators should be clearly visible
- User experience: Interactions should feel responsive and intuitive
- Maintainability: Code should follow existing architecture patterns

## Architecture

### State Management

#### WallModel Updates

Add a new observable property to track hovered wall:

```typescript
// src/model/wall.model.ts
export class WallModel {
  selectedWallId: WallId | null = null;
  hoveredWallId: WallId | null = null; // NEW
  
  // ... existing code ...
  
  setHoveredWall(wallId: WallId | null): void {
    this.hoveredWallId = wallId;
  }
  
  deselectWall(): void {
    this.selectedWallId = null;
    this.saveSelectedWall();
  }
}
```

### Scene Rendering

#### Hover Highlighting

**Approach**: Use material emissive property or overlay material for hover effect

**Implementation Strategy**:
- Track hover state in `WallModel` (reactive via MobX)
- In `scene.ts`, subscribe to `hoveredWallId` changes
- Apply emissive glow or overlay material to hovered wall mesh
- Use a subtle color (e.g., light blue tint) that doesn't obscure the wall texture

**Technical Details**:
- Modify wall material when `hoveredWallId` matches wall ID
- Use `MeshStandardMaterial.emissive` property for subtle glow effect
- Emissive intensity: 0.2-0.3 (subtle but visible)
- Color: Light blue (#4A90E2 or similar)

#### Selected Wall Perimeter Line

**Approach**: Use Three.js `Line` or `LineSegments` with dashed material

**Implementation Strategy**:
- Create a separate line geometry for each wall's perimeter
- Use `LineDashedMaterial` for dashed appearance
- Animate dash offset in render loop to create "running" effect
- Only render line for selected wall

**Technical Details**:
- Create perimeter line geometry based on wall dimensions and position
- Use `LineDashedMaterial` with:
  - `dashSize`: 0.1 (meters)
  - `gapSize`: 0.05 (meters)
  - `color`: Bright accent color (e.g., #FF6B6B or #4ECDC4)
  - `linewidth`: 2-3 pixels
- Store line objects in a `Map<WallId, Line>` for efficient updates
- Update `dashOffset` in animation loop: `material.dashOffset -= 0.01` per frame
- Position line slightly in front of wall surface (offset by 0.001m) to prevent z-fighting

**Perimeter Calculation**:
For each wall, calculate 4 corner points based on:
- Wall position (center point)
- Wall dimensions (width, height)
- Wall rotation

Example for front wall:
```typescript
// Front wall at z = -halfLength, facing +Z
const corners = [
  new Vector3(-halfWidth, -halfHeight, -halfLength + offset),
  new Vector3(halfWidth, -halfHeight, -halfLength + offset),
  new Vector3(halfWidth, halfHeight, -halfLength + offset),
  new Vector3(-halfWidth, halfHeight, -halfLength + offset),
  new Vector3(-halfWidth, -halfHeight, -halfLength + offset), // Close loop
];
```

### Event Handling

#### Mouse Hover Detection

**Implementation**:
- Add `mousemove` event listener to canvas container
- Use existing raycaster to detect wall under cursor
- Update `WallModel.hoveredWallId` on hover change
- Clear hover state when mouse leaves canvas or hovers non-wall area

**Integration with Existing Code**:
- Extend existing mouse event handlers in `scene.ts`
- Reuse raycaster setup from click handler
- Ensure hover detection doesn't interfere with drag detection

**Code Location**: `src/components/scene.ts`

### UI Component Updates

#### WallControls Component

Add deselection button:

```typescript
// src/ui/WallControls.tsx
// Add button in the header section when wall is selected
<button onClick={() => wallStore.deselectWall()}>
  Deselect Wall
</button>
```

**Design Considerations**:
- Place button near the wall name/header
- Use clear, descriptive label
- Style consistently with existing UI
- Consider icon (X or close icon) for visual clarity

## Implementation Plan

### Phase 1: Hover Highlighting

1. **Update WallModel**
   - Add `hoveredWallId: WallId | null` property
   - Add `setHoveredWall(wallId: WallId | null)` action
   - Make observable with `makeAutoObservable`

2. **Update Scene Rendering**
   - Add hover detection in `mousemove` event handler
   - Subscribe to `hoveredWallId` changes via `autorun`
   - Apply emissive material to hovered wall
   - Clear hover on mouse leave

3. **Material Management**
   - Store original material when applying hover effect
   - Restore original material when hover ends
   - Handle texture materials correctly (preserve texture when applying emissive)

### Phase 2: Selected Wall Perimeter Line

1. **Create Perimeter Line Utility**
   - Add function `createWallPerimeterLine(wallId, position, rotation, size)` in `src/lib/three.ts`
   - Calculate corner points based on wall geometry
   - Create `BufferGeometry` from points
   - Create `LineDashedMaterial` with appropriate settings

2. **Integrate into Scene**
   - Create perimeter lines for all editable walls during `updateRoom`
   - Store lines in `Map<WallId, Line>`
   - Show/hide line based on `selectedWallId`
   - Update line positions when room dimensions change

3. **Animate Dash Offset**
   - Update `LineDashedMaterial.dashOffset` in animation loop
   - Use time-based offset for smooth animation
   - Only animate line for selected wall

### Phase 3: Deselection UI

1. **Update WallModel**
   - Add `deselectWall()` action
   - Clear `selectedWallId` and save to storage

2. **Update WallControls Component**
   - Add "Deselect Wall" button in header section
   - Position appropriately (top-right of header or below title)
   - Style consistently with existing controls

## Technical Considerations

### Performance

- **Hover Detection**: Use throttling or frame-based checking to avoid excessive raycaster calls
- **Line Rendering**: Only render perimeter line for selected wall (not all walls)
- **Material Updates**: Batch material changes to avoid unnecessary re-renders

### Visual Design

- **Hover Color**: Subtle blue tint (#4A90E2 with 0.2-0.3 emissive intensity)
- **Selection Line**: Bright accent color (#FF6B6B or #4ECDC4) with 2-3px width
- **Line Animation**: Smooth, continuous animation (0.01-0.02 units per frame)

### Edge Cases

- **Wall Not Visible**: Handle case where selected wall is not in view (line should still render)
- **Rapid Hover Changes**: Debounce or throttle hover state updates
- **Room Dimension Changes**: Recalculate perimeter lines when dimensions change
- **Texture Materials**: Preserve texture when applying hover effect

### Code Organization

- **Perimeter Line Creation**: Add to `src/lib/three.ts` as utility function
- **Hover Detection**: Extend existing mouse handlers in `src/components/scene.ts`
- **State Management**: Extend `WallModel` in `src/model/wall.model.ts`
- **UI Updates**: Modify `WallControls` in `src/ui/WallControls.tsx`

## Testing Considerations

### Manual Testing Checklist

- [ ] Hover over wall shows highlight immediately
- [ ] Hover highlight disappears when mouse leaves wall
- [ ] Hover doesn't interfere with wall selection
- [ ] Hover doesn't interfere with camera rotation
- [ ] Selected wall shows animated dashed perimeter line
- [ ] Perimeter line updates when room dimensions change
- [ ] Deselect button clears selection
- [ ] After deselection, wall controls show "Click on a wall" message
- [ ] Selection persists after page reload (existing functionality)
- [ ] Hover works on all four editable walls

### Performance Testing

- Monitor frame rate during hover interactions
- Verify no frame drops when animating perimeter line
- Check memory usage (no leaks from line geometries)

## Dependencies

No new dependencies required. Implementation uses:
- Existing Three.js features (`LineDashedMaterial`, `Line`, `BufferGeometry`)
- Existing MobX reactivity
- Existing raycaster setup

## Future Enhancements (Out of Scope)

- Keyboard shortcuts for selection/deselection
- Multiple wall selection
- Customizable highlight/selection colors
- Selection history/undo

## Implementation Notes

### LineDashedMaterial Considerations

- `LineDashedMaterial` requires calling `computeLineDistances()` on geometry after creation
- Dash pattern may need adjustment based on wall size
- Line width may be limited by WebGL implementation (typically max 1-10px)

### Coordinate System

- All calculations should use Three.js coordinate system (meters)
- Wall positions and rotations are already established in `createWall` function
- Perimeter lines should match wall boundaries exactly

### Material Management

- When applying hover effect, clone material to avoid affecting other walls
- Dispose of cloned materials properly to prevent memory leaks
- Consider material pooling for performance if needed

