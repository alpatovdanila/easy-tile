import { observer } from 'mobx-react-lite';
import type { WallModel } from '../model/wall.model';
import { ColorPicker } from './ColorPicker';

interface WallControlsProps {
  wallStore: WallModel;
}

export const WallControls = observer(({ wallStore }: WallControlsProps) => {
  const selectedConfig = wallStore.selectedWallConfig;
  const selectedWallId = wallStore.selectedWallId;

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
      <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
        Wall Configuration: {selectedWallId}
      </h2>
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
            value={selectedConfig.spacing}
            onChange={(e) =>
              wallStore.setSpacing(
                selectedWallId,
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
        <ColorPicker
          value={selectedConfig.groutColor}
          onChange={(color) => wallStore.setGroutColor(selectedWallId, color)}
          label="Grout Color"
        />
      </div>
    </div>
  );
});

