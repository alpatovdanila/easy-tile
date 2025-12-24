import { observer } from 'mobx-react-lite';
import type { RoomModel } from '../model/room.model';

interface RoomControlsProps {
  roomStore: RoomModel;
}

export const RoomControls = observer(({ roomStore }: RoomControlsProps) => {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Room Dimensions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
            }}
          >
            Width (m)
          </label>
          <input
            type="number"
            value={roomStore.width}
            onChange={(e) =>
              roomStore.setWidth(Number.parseFloat(e.target.value) || 0)
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
            Height (m)
          </label>
          <input
            type="number"
            value={roomStore.height}
            onChange={(e) =>
              roomStore.setHeight(Number.parseFloat(e.target.value) || 0)
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
            Length (m)
          </label>
          <input
            type="number"
            value={roomStore.length}
            onChange={(e) =>
              roomStore.setLength(Number.parseFloat(e.target.value) || 0)
            }
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    </div>
  );
});

