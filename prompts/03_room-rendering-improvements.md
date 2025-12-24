# Room Rendering Improvements - Tech Specs

## Overview
This document specifies improvements to the 3D room rendering system to enhance visual accuracy and user experience.

## Requirements

### 1. Camera Height Positioning
**Problem**: Camera is currently positioned at the center of the room (Y=0), which means it moves up/down as room height changes.

**Requirement**: Camera should always be positioned at **1.8 meters from the floor**, regardless of room height changes.

**Implementation Details**:
- Camera Y position should be calculated as: `floorY + 1.8`
- Floor Y position = `-halfHeight` (where `halfHeight = room.height / 2`)
- Therefore: `camera.position.y = -halfHeight + 1.8`
- This must be updated whenever room dimensions change
- Camera should maintain its X and Z positions (center of room horizontally)
- Orbit controls should continue to work normally, rotating around the camera's position

**Files to Modify**:
- `src/components/scene.ts` - `initScene()` function (initial camera setup)
- `src/components/scene.ts` - `updateRoom()` function (update camera when room dimensions change)

**Technical Notes**:
- The camera position update should happen in the `updateRoom()` function after calculating room dimensions
- Ensure camera look-at direction is maintained after position update
- Orbit controls should continue to work from the new camera position

---

### 2. Tile Spacing/Grout Rendering
**Problem**: Currently, tile textures are applied with simple repeat wrapping, but the spacing/grout between tiles is not visible. The `spacing` value in the tile configuration is stored but not used in rendering.

**Requirement**: Tiles must show visible spacing (grout) between them based on the `spacing` value in the tile configuration.

**Implementation Details**:

#### Approach: Texture-Based Grout Rendering
Since Three.js materials don't natively support spacing in texture repetition, we need to create a composite texture that includes both the tile image and the grout spacing.

**Algorithm**:
1. For each wall with a tile image:
   - Calculate the effective tile size including spacing:
     - `effectiveTileWidth = tileWidth + spacing`
     - `effectiveTileHeight = tileHeight + spacing`
   - Create a canvas texture that combines:
     - The tile image centered in a larger area
     - Grout color filling the spacing area around the tile
   - Apply this composite texture to the wall with appropriate repeat values

2. For walls without a tile image (using default checkerboard):
   - The checkerboard pattern should also account for spacing
   - Each checkerboard square should represent a tile with spacing
   - Use grout color for the spacing areas

**Texture Creation Process**:
```
1. Create canvas with size: (tileWidth + spacing) x (tileHeight + spacing)
2. Fill entire canvas with grout color
3. If tile image exists:
   - Load tile image
   - Draw tile image centered in canvas, leaving spacing around edges
4. If no tile image:
   - Draw checkerboard pattern with spacing accounted for
5. Convert canvas to Three.js texture
6. Apply texture with repeat values based on effective tile size
```

**Repeat Calculation**:
- `repeatX = wallWidth / effectiveTileWidthMeters`
- `repeatY = wallHeight / effectiveTileHeightMeters`
- Where `effectiveTileWidthMeters = mmToMeters(tileWidth + spacing)`

**Files to Modify**:
- `src/components/scene.ts` - `createWall()` function
  - Modify texture creation logic to include spacing
  - Create helper function `createTileTextureWithSpacing()` to generate composite textures

**Helper Function Signature**:
```typescript
function createTileTextureWithSpacing(
  tileImageUrl: string | null,
  tileWidth: number, // mm
  tileHeight: number, // mm
  spacing: number, // mm
  groutColor: string,
  wallSize: Vector2 // wall dimensions in meters
): Texture
```

**Edge Cases**:
- If spacing is 0, render tiles without gaps (current behavior)
- If tile image fails to load, fall back to checkerboard pattern with spacing
- Ensure texture quality is maintained (use appropriate canvas resolution)

---

### 3. Ceiling and Floor Solid Colors
**Problem**: Ceiling and floor currently use a checkerboard pattern texture, which is not desired.

**Requirement**: 
- **Ceiling**: Solid white color (`#ffffff`)
- **Floor**: Solid gray color (recommended: `#808080` or `#666666`)
- Remove checkerboard pattern for both surfaces

**Implementation Details**:
- Replace checkerboard texture creation with solid color materials
- Use `MeshStandardMaterial` with `color` property instead of `map` texture
- No texture loading needed for ceiling/floor

**Files to Modify**:
- `src/components/scene.ts` - `createWall()` function
  - Modify the `else` branch (lines 364-375) that handles non-editable walls
  - Replace checkerboard texture creation with solid color materials

**Code Changes**:
```typescript
// For ceiling (top)
material = new MeshStandardMaterial({
  color: 0xffffff, // White
  side: DoubleSide,
});

// For floor (bottom)
material = new MeshStandardMaterial({
  color: 0x808080, // Gray
  side: DoubleSide,
});
```

**Color Specifications**:
- Ceiling: `#ffffff` (white)
- Floor: `#808080` (medium gray) - can be adjusted if needed

---

### 4. Vertical Drag Inversion
**Problem**: Vertical mouse drag movement is currently inverted - dragging the mouse down makes the camera look up, which feels counterintuitive.

**Requirement**: Vertical drag should be inverted relative to mouse movement. Dragging the mouse down should make the camera look down, and dragging up should make the camera look up.

**Implementation Details**:
- Currently in `createOrbitControls()` function: `rotationX -= deltaY * 0.005;`
- This means dragging down (positive deltaY) decreases rotationX, making camera look up
- Need to invert: `rotationX += deltaY * 0.005;` (or change sign)
- Horizontal drag (rotationY) should remain unchanged

**Files to Modify**:
- `src/lib/three.ts` - `createOrbitControls()` function
  - Modify the `onMouseMove` handler (around line 56)
  - Change `rotationX -= deltaY * 0.005;` to `rotationX += deltaY * 0.005;`

**Technical Notes**:
- This is a simple sign change in the rotation calculation
- The rotation clamping (line 59) should remain the same
- Horizontal rotation (rotationY) should not be affected

---

## Implementation Order

1. **Camera Height** (Simplest, no dependencies)
   - Update camera positioning logic
   - Test with different room heights

2. **Vertical Drag Inversion** (Simple, independent)
   - Update orbit controls rotation calculation
   - Test drag behavior feels natural

3. **Ceiling/Floor Colors** (Simple, independent)
   - Replace checkerboard with solid colors
   - Verify visual appearance

4. **Tile Spacing** (Most complex)
   - Implement texture compositing logic
   - Handle both image and checkerboard cases
   - Test with various spacing values

1. **Camera Height** (Simplest, no dependencies)
   - Update camera positioning logic
   - Test with different room heights

2. **Ceiling/Floor Colors** (Simple, independent)
   - Replace checkerboard with solid colors
   - Verify visual appearance

3. **Tile Spacing** (Most complex)
   - Implement texture compositing logic
   - Handle both image and checkerboard cases
   - Test with various spacing values

## Testing Checklist

### Camera Height
- [ ] Camera is at 1.8m from floor with default room dimensions
- [ ] Camera maintains 1.8m height when room height is increased
- [ ] Camera maintains 1.8m height when room height is decreased
- [ ] Orbit controls work correctly from new camera position
- [ ] Camera remains centered horizontally (X, Z = 0)

### Tile Spacing
- [ ] Spacing is visible between tiles when tile image is set
- [ ] Spacing color matches grout color setting
- [ ] Spacing works correctly with different tile sizes
- [ ] Spacing works correctly with different spacing values (0mm, 3mm, 10mm)
- [ ] Checkerboard pattern (no image) also shows spacing
- [ ] Texture quality is maintained with spacing
- [ ] Edge cases handled (spacing = 0, very large spacing)

### Ceiling/Floor Colors
- [ ] Ceiling is solid white (no checkerboard)
- [ ] Floor is solid gray (no checkerboard)
- [ ] Colors are consistent across different room sizes
- [ ] Materials render correctly with lighting

### Vertical Drag Inversion
- [ ] Dragging mouse down makes camera look down (natural behavior)
- [ ] Dragging mouse up makes camera look up (natural behavior)
- [ ] Horizontal drag behavior remains unchanged
- [ ] Rotation clamping still works correctly (prevents over-rotation)

## Notes

- All changes should maintain backward compatibility with existing stored configurations
- Performance should not degrade significantly with texture compositing
- Consider caching composite textures if performance becomes an issue
- The 1.8m camera height represents typical eye level for standing adults

