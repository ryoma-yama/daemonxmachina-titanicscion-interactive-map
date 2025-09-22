# GitHub Copilot Instructions for Daemon X Machina: Titanic Scion Interactive Map

## Project Overview
This is an interactive web-based map application for the game "Daemon X Machina: Titanic Scion" that allows users to track collectible items (dungeons, logs, cards, etc.) across multiple game maps. Users can click markers to toggle collection status, with state persisted in localStorage.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (ES modules)
- **Build Tool**: Vite
- **Map Library**: Leaflet.js v1.9.4 (npm package)
- **Data Storage**: Browser localStorage
- **Coordinate System**: Leaflet's L.CRS.Simple (pixel-based, not lat/lng)
- **Data Format**: GeoJSON for marker definitions
- **Icons**: SVG icons with CSS mask-based coloring
- **Linting/Formatting**: Biome
- **Package Manager**: pnpm

## Project Structure
```
/
├── index.html              # Main HTML entry point
├── README.md              # Comprehensive project documentation
├── LICENSE                # MIT License file
├── package.json           # Package dependencies and scripts
├── pnpm-lock.yaml         # Package lock file
├── vite.config.js         # Vite configuration
├── biome.json             # Biome configuration
├── test_add_marker.py     # Test file for marker script
├── public/                # Static assets
│   ├── site.webmanifest   # Web app manifest
│   ├── favicon files      # Various favicon formats
│   └── assets/            # Game assets
│       ├── data/markers/  # Marker definitions (GeoJSON)
│       ├── icons/         # SVG icons for categories
│       └── maps/          # Game map images (JPEG)
├── scripts/
│   └── add_marker.py      # Python utility for adding markers
└── src/                   # Source code
    ├── main.js            # Application entry point
    ├── app-controller.js  # Main application controller
    ├── map-view.js        # Map rendering and interaction
    ├── map-definitions.js # Map configuration data
    ├── collection-store.js # Data persistence layer
    ├── icons.js           # Icon creation utilities
    ├── validation.js      # Data validation utilities
    └── styles.css         # Main stylesheet
```

## Key Technical Concepts

### Coordinate System
- Uses `L.CRS.Simple` instead of geographic coordinates
- Coordinates are in pixels: `[x, y]` where (0,0) is top-left
- Always use `bounds = [[0, 0], [height, width]]` format for new maps

### Map Implementation
- Images loaded via `L.imageOverlay(imagePath, bounds)`
- Recording mode: Press `Shift + R` to toggle coordinate recording mode
- Debug feature: Click map to log coordinates to console
- Recording mode: Automatically copies coordinates to clipboard for script usage

### Marker System
- Defined in GeoJSON format with properties: `id`, `name`, `category`
- Custom colored icons using CSS mask technique
- Colors defined in fluorescent palette in `src/icons.js`

### Data Persistence
- localStorage keys format: `collect-map:v1:{mapId}`
- Storage format: `{ markerId: true/false }` for collection status
- Handled by `collection-store.js` module

## Development Guidelines

### Code Style
- Use vanilla JavaScript (ES6+)
- Console logging for debugging is standard practice
- Use descriptive variable names in English

### Leaflet Usage
- Always refer to [Leaflet documentation](https://leafletjs.com/reference.html) for API usage
- Use `L.CRS.Simple` for all coordinate calculations
- Marker creation: Use `L.marker()` with custom `L.divIcon`
- Popup content: HTML strings with inline styles acceptable

### Asset Management
- Map images: JPEG format, consistent sizing preferred
- Icons: SVG format for scalability
- New categories require both SVG icon and color definition in `colors` object
- GeoJSON: Follow existing structure with `id`, `name`, `category` properties
- Assets organized under `public/assets/` directory

### Testing & Debugging
- Open browser console to see coordinate clicks and loading status
- Recording mode (`Shift + R`) for coordinate capture and clipboard copy
- Development server: `pnpm dev` (Vite dev server)
- Test marker interactions by clicking on map elements
- Verify localStorage persistence manually via dev tools

### HTML Verification
- To preview the application during development:
```
pnpm dev
```

### HTML Language Setting
- Always set the language attribute in `index.html` as:
```html
<html lang="en">
```

### Comments and Text
All code comments and in-app text must be written in English.

## Common Tasks

### Adding New Markers
1. Add entry to `public/assets/data/markers/*.geojson`
2. Ensure category exists in `colors` object in `src/icons.js`
3. Add corresponding SVG icon to `public/assets/icons/` if new category

### Adding New Maps
1. Add image to `public/assets/maps/`
2. Update bounds in main.js for image dimensions
3. Implement map switching logic (currently single map)
4. Update localStorage key structure for multiple maps

### Icon Customization
- Icons use CSS mask technique for recoloring
- Colors defined in fluorescent palette for visibility
- SVG icons should be black/transparent for proper masking
- Size configurable via `createCategoryIcon()` function

## Important Notes
- Uses Vite for modern development workflow and building
- Leaflet dependency managed via npm
- Click debugging feature helps with coordinate mapping
- Recording mode feature helps with coordinate mapping
- Project follows modular architecture with clear separation of concerns

## Git Workflow
- Uses conventional commits
- Auto-implementation prompts available in `.github/prompts/`
- Issue templates available in `.github/ISSUE_TEMPLATE/` for structured contributions
- Draft PRs for review workflow
- Main branch is default target

### Pre-commit and PR checks

- Run `pnpm fix` after implementation to apply safe automatic fixes
- Run `pnpm check` and ensure there are no warnings or errors
- Verify no unnecessary diffs are introduced, then commit with conventional commits and open a PR
