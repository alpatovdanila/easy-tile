# UI Improvements Tech Spec

## Overview
This document outlines the technical specifications for three UI improvements to enhance user experience and performance.

---

## 1. Clear File Input on Wall Selection Change

### Problem
When changing the selected wall, the file input element retains the previously selected file as a placeholder value, which is confusing and misleading.

### Current Behavior
- User selects a wall and uploads an image
- User selects a different wall
- File input still shows the previous wall's file name/value

### Expected Behavior
- When a wall is deselected or a different wall is selected, the file input should be cleared/reset
- The file input should not display any previous file selection

### Technical Implementation

#### Files to Modify
- `src/ui/WallControls.tsx`

#### Implementation Details
1. **Add a key prop to the file input** that changes when `selectedWallId` changes
   - This will force React to unmount and remount the input, clearing its value
   - Use `key={selectedWallId}` on the file input element

2. **Alternative approach**: Use a ref to programmatically clear the input value
   - Create a ref for the file input
   - Use `useEffect` to watch for `selectedWallId` changes
   - Call `inputRef.current.value = ''` when wall selection changes

#### Recommended Solution
Use the `key` prop approach as it's simpler and more React-idiomatic:

```typescript
<input
  key={selectedWallId} // Force remount when wall changes
  type="file"
  accept="image/*"
  onChange={...}
/>
```

#### Testing Checklist
- [ ] Select a wall and upload an image
- [ ] Select a different wall
- [ ] Verify file input is cleared (no file name shown)
- [ ] Verify file input is cleared when deselecting a wall

---

## 2. Performance Optimization: Throttle Grout Color and Spacing Changes

### Problem
Changing grout color and spacing causes browser stuttering and very slow updates. The changes should be real-time but need to be throttled to maintain smooth performance.

### Root Cause Analysis
- Every change to grout color or spacing triggers `updateWallConfig()` in `WallModel`
- This calls `saveToStorage()` synchronously on every change
- The `autorun` in `scene.ts` (line 118) triggers `updateRoom()` on every store change
- `updateRoom()` completely rebuilds all walls, textures, and materials, which is expensive
- Rapid changes (e.g., color picker drag) cause multiple expensive rebuilds per second

### Expected Behavior
- Changes should appear in real-time (within ~100-200ms)
- Browser should remain responsive during changes
- No stuttering or lag when dragging color picker or typing in spacing input

### Technical Implementation

#### Files to Modify
- `src/model/wall.model.ts` - Add throttling for `setSpacing` and `setGroutColor`
- `src/ui/WallControls.tsx` - Potentially add local state for immediate UI feedback
- `src/lib/` - Create a throttling utility (if not exists)

#### Implementation Strategy

**Option 1: Throttle Store Updates (Recommended)**
- Throttle the actual store updates (spacing and grout color)
- Keep UI updates immediate using local component state
- Debounce/throttle the store mutation to reduce scene rebuilds

**Option 2: Optimize Scene Updates**
- Instead of rebuilding entire room on every change, update only the affected wall's material
- This requires refactoring `updateRoom()` to support incremental updates

**Recommended: Hybrid Approach**
1. **Immediate UI feedback**: Use local state in `WallControls` for spacing and color inputs
2. **Throttled store updates**: Throttle calls to `wallStore.setSpacing()` and `wallStore.setGroutColor()`
3. **Optimize scene updates**: Modify scene update logic to update only affected wall materials instead of rebuilding entire room

#### Implementation Details

**Step 1: Create Throttle Utility**
- Create `src/lib/throttle.ts` with a throttle function
- Use `requestAnimationFrame` or time-based throttling (e.g., 100ms)

**Step 2: Modify WallModel**
- Add throttled versions of `setSpacing` and `setGroutColor`
- Keep immediate updates for other properties (tile size, image)
- Consider separating immediate updates from storage saves

**Step 3: Modify WallControls Component**
- Use local state for spacing and color inputs
- Sync local state to store with throttling
- Ensure store state is source of truth on component mount

**Step 4: Optimize Scene Updates (Optional but Recommended)**
- Modify `updateRoom()` in `scene.ts` to accept a `wallId` parameter
- Create `updateWallMaterial()` function that only updates a single wall's material
- Use this for spacing/color changes instead of full room rebuild

#### Code Structure

```typescript
// src/lib/throttle.ts
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: number | null = null;
  
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}
```

#### Throttle Timing
- **Spacing input**: 150ms throttle (typing should feel responsive)
- **Color picker**: 100ms throttle (dragging should be smooth)
- Consider using `requestAnimationFrame` for color picker for even smoother updates

#### Testing Checklist
- [ ] Drag color picker - verify smooth updates without stuttering
- [ ] Type rapidly in spacing input - verify responsive updates
- [ ] Verify changes are saved to storage (may be delayed due to throttling)
- [ ] Verify changes persist after page reload
- [ ] Test with multiple rapid changes - browser should remain responsive

---

## 3. Change Room Dimensions from Millimeters to Meters

### Problem
Room dimensions are currently displayed and stored in millimeters, which is not user-friendly. Users typically think in meters for room dimensions.

### Current Behavior
- Room dimensions stored as millimeters (e.g., 3000mm = 3m)
- UI displays "Width (mm)", "Height (mm)", "Length (mm)"
- Default values: 3000mm x 2500mm x 4000mm

### Expected Behavior
- Room dimensions displayed and input in meters
- UI labels show "Width (m)", "Height (m)", "Length (m)"
- Default values: 3m x 2.5m x 4m
- Internal storage can remain in meters (no conversion needed)
- Scene rendering already converts to meters, so this simplifies the codebase

### Technical Implementation

#### Files to Modify
- `src/types/room.types.ts` - Update type comments and default values
- `src/model/room.model.ts` - Update default values and comments
- `src/ui/RoomControls.tsx` - Update labels from "(mm)" to "(m)"
- `src/components/scene.ts` - Remove `mmToMeters()` conversion (already uses meters internally)

#### Implementation Details

**Step 1: Update Type Definitions**
- Change comments in `room.types.ts` from `// mm` to `// meters`
- Update `DEFAULT_ROOM_DIMENSIONS` to use meter values (3, 2.5, 4)

**Step 2: Update RoomModel**
- Update default values in constructor
- Update comments to reflect meters
- No logic changes needed (storage format can stay the same)

**Step 3: Update RoomControls UI**
- Change labels from "Width (mm)" to "Width (m)"
- Change labels from "Height (mm)" to "Height (m)"
- Change labels from "Length (mm)" to "Length (m)"
- No value conversion needed in component (values already in meters)

**Step 4: Update Scene Rendering**
- Remove `mmToMeters()` conversion calls in `scene.ts` for room dimensions
- Room dimensions are already in meters, so use them directly
- Keep `mmToMeters()` for tile dimensions (tiles should remain in mm)

**Step 5: Migration for Existing Users**
- Consider adding migration logic to convert stored mm values to meters
- Check if stored values are > 100 (likely in mm) and divide by 1000
- Or add a version flag to storage and migrate on first load

#### Migration Strategy

**Option 1: Automatic Migration (Recommended)**
- On app load, check if room dimensions are > 100
- If so, assume they're in mm and convert to meters
- Only migrate once (add a flag to prevent re-migration)

**Option 2: Version-Based Migration**
- Add a storage version number
- Migrate data when version changes
- More robust but requires version management

#### Code Changes Summary

```typescript
// src/types/room.types.ts
export type RoomDimensions = {
  width: number; // meters (changed from mm)
  height: number; // meters
  length: number; // meters
};

export const DEFAULT_ROOM_DIMENSIONS: RoomDimensions = {
  width: 3,    // was 3000
  height: 2.5, // was 2500
  length: 4,   // was 4000
};
```

```typescript
// src/components/scene.ts
// Change from:
const width = mmToMeters(store.room.width);
// To:
const width = store.room.width; // Already in meters
```

#### Testing Checklist
- [ ] Verify default room dimensions display as 3m x 2.5m x 4m
- [ ] Enter new room dimensions in meters - verify they work correctly
- [ ] Verify 3D scene renders with correct dimensions
- [ ] Test migration: load app with old mm values, verify they convert to meters
- [ ] Verify storage persists meter values correctly
- [ ] Verify tile dimensions still work correctly (should remain in mm)

---

## Implementation Order

1. **Clear File Input** (Simplest, low risk)
2. **Room Dimensions to Meters** (Medium complexity, requires migration)
3. **Performance Optimization** (Most complex, requires careful testing)

## Dependencies

- No new external dependencies required
- All changes use existing React, MobX, and Three.js APIs

## Risk Assessment

### Low Risk
- Clear file input on wall change
- Room dimensions unit change (with proper migration)

### Medium Risk
- Performance optimization (throttling) - requires careful testing to ensure no regressions

## Notes

- All changes should maintain backward compatibility where possible
- Storage migration should be handled gracefully
- Performance improvements should be measured before/after to verify improvement

