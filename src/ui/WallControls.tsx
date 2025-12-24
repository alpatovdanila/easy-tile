import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import type { WallModel } from '../model/wall.model';
import { ColorPicker } from './ColorPicker';
import { throttle } from '../lib/throttle';

interface WallControlsProps {
  wallStore: WallModel;
}

const WallControlsComponent = ({ wallStore }: WallControlsProps) => {
  const selectedConfig = wallStore.selectedWallConfig;
  const selectedWallId = wallStore.selectedWallId;

  // Local state for immediate UI feedback
  const [localSpacing, setLocalSpacing] = useState<number | null>(null);
  const [localGroutColor, setLocalGroutColor] = useState<string | null>(null);

  // Create throttled store update functions
  const throttledSetSpacingRef = useRef<((spacing: number) => void) | null>(null);
  const throttledSetGroutColorRef = useRef<((color: string) => void) | null>(null);

  // Initialize throttled functions
  useEffect(() => {
    if (selectedWallId !== null) {
      throttledSetSpacingRef.current = throttle((spacing: number) => {
        wallStore.setSpacing(selectedWallId, spacing);
      }, 150);

      throttledSetGroutColorRef.current = throttle((color: string) => {
        wallStore.setGroutColor(selectedWallId, color);
      }, 100);
    }
    return () => {
      throttledSetSpacingRef.current = null;
      throttledSetGroutColorRef.current = null;
    };
  }, [selectedWallId, wallStore]);

  // Sync local state with store when wall selection changes
  useEffect(() => {
    if (selectedConfig) {
      setLocalSpacing(selectedConfig.spacing);
      setLocalGroutColor(selectedConfig.groutColor);
    } else {
      setLocalSpacing(null);
      setLocalGroutColor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWallId]);

  if (!selectedConfig || selectedWallId === null) {
    return (
      <div>
        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Wall Configuration</h2>
        <p style={{ color: '#666' }}>Click on a wall to configure it</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>
          Wall Configuration: {selectedWallId}
        </h2>
        <button
          onClick={() => wallStore.deselectWall()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          title="Deselect wall"
        >
          ✕ Deselect
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}
          >
            Tile Image
          </label>
          <input
            key={selectedWallId}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const dataUrl = event.target?.result as string;
                  if (dataUrl) {
                    wallStore.setTileImage(selectedWallId, dataUrl);
                  }
                };
                reader.readAsDataURL(file);
              } else {
                wallStore.setTileImage(selectedWallId, null);
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          {selectedConfig.imageUrl && (
            <button
              onClick={() => wallStore.setTileImage(selectedWallId, null)}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Remove Image
            </button>
          )}
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}
          >
            Tile Width (mm)
          </label>
          <input
            type="number"
            value={selectedConfig.tileWidth}
            onChange={(e) =>
              wallStore.setTileSize(
                selectedWallId,
                Number.parseFloat(e.target.value) || 0,
                selectedConfig.tileHeight
              )
            }
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}
          >
            Tile Height (mm)
          </label>
          <input
            type="number"
            value={selectedConfig.tileHeight}
            onChange={(e) =>
              wallStore.setTileSize(
                selectedWallId,
                selectedConfig.tileWidth,
                Number.parseFloat(e.target.value) || 0
              )
            }
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}
          >
            Spacing (mm)
          </label>
          <input
            type="number"
            value={localSpacing ?? selectedConfig.spacing}
            onChange={(e) => {
              const value = Number.parseFloat(e.target.value) || 0;
              setLocalSpacing(value);
              if (throttledSetSpacingRef.current) {
                throttledSetSpacingRef.current(value);
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
        <ColorPicker
          value={localGroutColor ?? selectedConfig.groutColor}
          onChange={(color) => {
            setLocalGroutColor(color);
            if (throttledSetGroutColorRef.current) {
              throttledSetGroutColorRef.current(color);
            }
          }}
          label="Grout Color"
        />
      </div>
    </div>
  );
};

export const WallControls = observer(WallControlsComponent);

