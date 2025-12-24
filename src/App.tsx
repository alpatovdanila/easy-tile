import { observer } from 'mobx-react-lite';
import { rootStore } from './model';
import { RoomControls, WallControls } from './ui';
import './App.css';

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
