# Daemon X Machina: Titanic Scion Interactive Map

This project provides an interactive fan-made map for **Daemon X Machina: Titanic Scion**. 
It helps players track collectible items (dungeons, logs, cards, etc.) across multiple game maps with a browser-based interface.

## Disclaimer
- ©2025 Marvelous Inc.
- This is an **unofficial fan project**. It is not affiliated with or endorsed by Marvelous Inc.
- Screenshots, map images, and other in-game assets are used in accordance with the official guidelines.
- Please check the official guidelines (Japanese): [Video / Streaming / Screenshot Guidelines](https://jp.daemonxmachina.com/titanicscion/news/article/32682) (Last checked: 2025-09-21)

## Features
- Interactive maps for Forest, Desert, and Mountains areas
- Click markers to toggle collection status
- Progress automatically saved to browser localStorage
- Category-based marker icons (dungeons, logs, cards, chests, etc.)
- Map switching with dropdown selection
- Mobile-friendly responsive design

## Technical Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (ES modules)
- **Build Tool**: Vite
- **Map Library**: [Leaflet.js](https://leafletjs.com/) v1.9.4 (npm package)
- **Data Storage**: Browser localStorage
- **Coordinate System**: Leaflet's L.CRS.Simple (pixel-based, not lat/lng)
- **Data Format**: GeoJSON for marker definitions
- **Icons**: SVG icons with CSS mask-based coloring
  - Uses custom `L.divIcon` with SVG content exclusively
  - Leaflet default marker icons are **not used** in this application
- **Linting/Formatting**: Biome
- **Package Manager**: pnpm

## Key Technical Concepts
- **Coordinate System**: Uses `L.CRS.Simple` instead of geographic coordinates
- **Map Implementation**: Images loaded via `L.imageOverlay(imagePath, bounds)`
- **Marker System**: Defined in GeoJSON format with properties: `id`, `name`, `category`
- **Data Persistence**: localStorage keys format: `collect-map:v1:{mapId}`

## Development Setup

### Prerequisites
- Node.js 22.19.0 or higher
- pnpm 10.0.0 or higher

### Local Development
1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Open `http://localhost:3000` in your browser

### Build for Production
```bash
pnpm build
```

### Code Quality
```bash
# Run linting and formatting checks
pnpm check

# Auto-fix issues
pnpm fix
```

### Browser Compatibility
- Modern browsers with ES6+ support
- Local storage must be enabled
- JavaScript must be enabled

## Adding New Content

### Recording Mode (Developer Feature)
The application includes a "Recording mode" for easily capturing marker coordinates:

1. **Enable Recording Mode**: Press `Shift + R` to toggle recording mode on/off
2. **Visual Indicator**: A red "REC" badge appears when recording mode is active
3. **Capture Coordinates**: Click anywhere on the map to record coordinates
4. **Output Format**: Coordinates are logged to console as JSON and copied to clipboard in the format:
   ```
   {mapId} {x} {y} <category> "<name>" ""
   ```
5. **Usage**: The clipboard output can be used directly with the `add_marker.py` script for batch marker addition

**Note**: Recording mode is intended for developers and contributors to easily capture accurate pixel coordinates for new markers.

### Adding New Markers
1. Add entry to appropriate `public/assets/data/markers/{map}.geojson` file
2. Ensure category exists in `colors` object in `src/icons.js`
3. Add corresponding SVG icon to `public/assets/icons/` if new category

### Adding New Maps
1. Add image to `public/assets/maps/`
2. Update `mapDefinitions` in `src/map-definitions.js`
3. Create corresponding GeoJSON file in `public/assets/data/markers/`

## Credits
- [Music Data Locations — Steam Community Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3569600723), Author: Lethendra

## License
- The **source code** of this repository is licensed under the [MIT License](./LICENSE).
- All game content and assets remain the property of Marvelous Inc.
- This repository does not grant any rights to use game assets beyond what is permitted by the official guidelines.

## Assets License
- Music 186, File Alt 8 — Author: Dazzle UI, Licensed under CC BY 4.0
- Evil Skeleton Rpg, Card Casino Games, Chest Games Gaming — Licensed under CC0 (No attribution required)

## Contributing
This is primarily a personal project for game progress tracking. 
While contributions are welcome, please note the scope is intentionally limited to maintain simplicity.

### Development Guidelines
- Use vanilla JavaScript (ES6+ modules)
- Console logging for debugging is standard practice
- Follow existing code style and patterns
- Use Biome for code formatting and linting
- Test changes across different browsers
- Ensure mobile compatibility
- Run `pnpm check` before committing changes

#### CSS Important Rules
This project uses `!important` declarations in CSS for the following justified reasons:
- **Leaflet Override Requirements**: Third-party library (Leaflet.js) styles require `!important` to override default themes
- **Specificity Management**: Ensures consistent theming across different browser implementations
- **Third-party Integration**: Common practice when integrating external map libraries that inject their own styles

The `complexity.noImportantStyles` rule is disabled in `biome.json` for this reason.

## Support
For issues related to:
- **Game content**: Contact Marvelous Inc. official support
- **This tool**: Create an issue in this repository

---

*This project is maintained as a fan project and learning exercise. It uses a modern Vite-based development workflow while maintaining vanilla JavaScript for the core application logic.*
