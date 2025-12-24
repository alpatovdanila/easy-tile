# Easy Tile

A web-based 3D room visualization tool that helps customers preview how decorative tiling will look in their space before making a purchase.

## Overview

Easy Tile provides an interactive 3D environment where users can:
- Configure room dimensions to match their space
- Upload tile images and customize tile layouts
- Adjust tile sizes, spacing, and grout colors
- Visualize the results in real-time from any angle

All configurations are automatically saved and restored when you return to the application.

## Features

- **Interactive 3D Visualization**: Rotate and examine your room from any angle
- **Room Configuration**: Adjust width, height, and length in meters
- **Wall Selection**: Click on walls to select and configure them individually
- **Tile Customization**: 
  - Upload custom tile images
  - Set tile dimensions (width and height in millimeters)
  - Configure spacing between tiles
  - Choose grout color with a color picker
- **Visual Feedback**: Hover highlighting and animated selection indicators
- **Automatic Persistence**: All settings are saved automatically

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D rendering
- **MobX** - State management
- **Vite** - Build tool and dev server

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/alpatovdanila/easy-tile.git
cd easy-tile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Usage

1. **Adjust Room Dimensions**: Use the controls panel to set your room's width, height, and length
2. **Select a Wall**: Click on any of the four side walls (front, back, left, right) to select it
3. **Configure Tiles**: 
   - Upload a tile image (optional)
   - Set tile width and height
   - Adjust spacing between tiles
   - Choose a grout color
4. **Rotate View**: Drag with your mouse to rotate the 3D view
5. **Configure Other Walls**: Select and configure additional walls with different tile settings

All changes are saved automatically and will be restored when you return to the application.

## Project Structure

```
src/
├── components/     # 3D scene components
├── model/         # MobX stores (state management)
├── lib/           # Utility libraries
├── ui/            # React UI components
└── types/         # TypeScript type definitions
```

## Documentation

For detailed feature documentation, see [prompts/04_MILESTONE_v1.0.md](prompts/04_MILESTONE_v1.0.md)

## License

Private project
