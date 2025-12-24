import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
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
  reactRoot.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
