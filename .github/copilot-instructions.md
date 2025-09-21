# GitHub Copilot Instructions for Daemon X Machina: Titanic Scion Interactive Map

## Project Overview
This is an interactive web-based map application for the game "Daemon X Machina: Titanic Scion" that allows users to track collectible items (dungeons, logs, cards, etc.) across multiple game maps. Users can click markers to toggle collection status, with state persisted in localStorage.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Map Library**: Leaflet.js v1.9.4 (via CDN)
- **Data Storage**: Browser localStorage
- **Coordinate System**: Leaflet's L.CRS.Simple (pixel-based, not lat/lng)
- **Data Format**: GeoJSON for marker definitions
- **Icons**: SVG icons with CSS mask-based coloring

## Project Structure
```
/
├── index.html              # Main HTML entry point
├── README.md              # Comprehensive project documentation
├── assets/
│   ├── data/
│   │   └── markers/       # Marker definitions for all maps
│   ├── icons/             # SVG icons for different categories
│   └── maps/              # Game map images
└── src/
    ├── icons.js           # Icon creation utilities
    └── main.js            # Main application logic
```

## Key Technical Concepts

### Coordinate System
- Uses `L.CRS.Simple` instead of geographic coordinates
- Coordinates are in pixels: `[x, y]` where (0,0) is top-left
- Always use `bounds = [[0, 0], [height, width]]` format for new maps

### Map Implementation
- Images loaded via `L.imageOverlay(imagePath, bounds)`
- Debug feature: Click map to log coordinates to console

### Marker System
- Defined in GeoJSON format with properties: `id`, `name`, `category`
- Custom colored icons using CSS mask technique
- Colors defined in fluorescent palette in `src/icons.js`

### Data Persistence
- localStorage keys format: `collect-map:v1:{mapId}`
- Storage format: `{ markerId: true/false }` for collection status

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

### Testing & Debugging
- Open browser console to see coordinate clicks and loading status
- No build process - direct file serving works
- Test marker interactions by clicking on map elements
- Verify localStorage persistence manually via dev tools

### HTML Verification
- To preview HTML files, start a local server with:
```
python3 -m http.server 8000 --bind 0.0.0.0
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
1. Add entry to `assets/data/marker/*.geojson`
2. Ensure category exists in `colors` object in `src/icons.js`
3. Add corresponding SVG icon to `assets/icons/` if new category

### Adding New Maps
1. Add image to `assets/maps/`
2. Update bounds in main.js for image dimensions
3. Implement map switching logic (currently single map)
4. Update localStorage key structure for multiple maps

### Icon Customization
- Icons use CSS mask technique for recoloring
- Colors defined in fluorescent palette for visibility
- SVG icons should be black/transparent for proper masking
- Size configurable via `createCategoryIcon()` function

## Important Notes
- No build tools or package.json - pure static files
- All dependencies loaded via CDN
- Click debugging feature helps with coordinate mapping
- Project follows simple, lightweight architecture philosophy

## Git Workflow
- Uses conventional commits
- Auto-implementation prompts available in `.github/prompts/`
- Draft PRs for review workflow
- Main branch is default target