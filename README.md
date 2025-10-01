# Daemon X Machina: Titanic Scion Interactive Map

This project provides an interactive fan-made map for **Daemon X Machina: Titanic Scion**. 
It helps players track collectible items (dungeons, logs, cards, etc.) across multiple game maps with a browser-based interface.

## Disclaimer
- ©2025 Marvelous Inc.
- This is an **unofficial fan project**. It is not affiliated with or endorsed by Marvelous Inc.
- Screenshots, map images, and other in-game assets are used in accordance with the official guidelines.
- Please check the official guidelines (Japanese): [Video / Streaming / Screenshot Guidelines](https://jp.daemonxmachina.com/titanicscion/news/article/32682) (Last checked: 2025-09-21)

Detailed credits and support information are available on the [About page](./about.html).

## Features
- Interactive maps for Forest, Desert, Mountains, and Garden areas
- Click markers to toggle collection status
- Progress automatically saved to browser localStorage
- Category-based marker icons (dungeons, logs, cards, chests, etc.)
- Map switching with dropdown selection
- Mobile-friendly responsive design

## Technical Stack
- **Frontend**: Vanilla HTML/CSS/TypeScript (ES modules)
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

### API Key Setup
1. Copy the template file into the `.vscode` folder:
   ```bash
   cp .vscode/mcp.json.template .vscode/mcp.json
   ```
2. Edit `.vscode/mcp.json` and replace `YOUR_API_KEY`.

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
# Static analysis and formatting
pnpm check

# TypeScript type-checking
pnpm typecheck

# Run the automated test suites
pnpm test
pnpm exec playwright test

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
   {mapId} {x} {y} category "name" ""
   ```
5. **Usage**: The clipboard output can be used directly with the `add_marker.py` script for batch marker addition

**Note**: Recording mode is intended for developers and contributors to easily capture accurate pixel coordinates for new markers.

### Adding New Markers
1. Add entry to appropriate `public/assets/data/markers/{map}.geojson` file
2. Ensure category exists in `colors` object in `src/constants.js`
3. Add corresponding SVG icon to `public/assets/icons/` if new category

### Adding New Maps
1. Add image to `public/assets/maps/`
2. Update `mapDefinitions` in `src/map-definitions.js`
3. Create corresponding GeoJSON file in `public/assets/data/markers/`

### Auditing Marker Numbering
Use the GeoJSON audit script to aggregate marker data, detect numbering gaps, and export filtered reports:

```bash
pnpm audit-geojson --start 4 --end 164 --category card
pnpm audit-geojson --start 130 --end 216 --category decal
pnpm audit-geojson --start 10 --end 86 --category log
pnpm audit-geojson --start 3 --end 37 --category music
```

- `--start` / `--end`: inclusive numeric range used for gap detection (`No.xxx` prefix)
- `--category`: marker category to include in the `output` array
- `--out`: optional custom path for the written report (defaults to `tmp/<category>/audit.json`)

The command prints the audit result to stdout and writes the same JSON file to the configured path, including:
- `missingNumbers`: zero-padded gaps within the specified range
- `noNumberPrefix`: entries whose names do not start with a `No.xxx` prefix
- `sortedByName`: all markers sorted with `Intl.Collator("ja")`
- `output`: markers whose `category` matches the provided filter

## Assets License

- Dungeon Solid — Icons8 — [MIT](https://opensource.org/licenses/MIT)
- Dazzle UI — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
  - Music 186
  - File Alt 8
  - Search
  - Xmark
  - User Alt 1
  - Eye Slash Alt
  - Eye Alt
  - Filter
  - Link Alt 1
  - Circle
  - Triangle
  - Rhombus
  - Square
  - Square Check
  - Cart Shopping
- Card Casino Games — SVG Repo — [CC0](https://creativecommons.org/publicdomain/zero/1.0/)

## License
- The **source code** of this repository is licensed under the [MIT License](./LICENSE).
- All game content and assets remain the property of Marvelous Inc.
- This repository does not grant any rights to use game assets beyond what is permitted by the official guidelines.

## Contributing
This is primarily a personal project for game progress tracking. 
While contributions are welcome, please note the scope is intentionally limited to maintain simplicity.

### Development Guidelines
- Use TypeScript modules with ES2022 syntax.
- Prefer explicit types for public exports; allow inference for narrow-scope locals when it keeps intent clear.
- Console logging for debugging is standard practice.
- Follow existing code style and patterns.
- Use Biome for code formatting and linting.
- Keep shared type definitions in `src/types/` so modules can import stable contracts.
- Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm exec playwright test` before committing changes.
- Test changes across different browsers and ensure mobile compatibility.
- Refer to [`docs/typescript-migration/wrap-up.md`](./docs/typescript-migration/wrap-up.md) for post-migration conventions and lessons learned.

#### CSS Important Rules
This project uses `!important` declarations in CSS for the following justified reasons:
- **Leaflet Override Requirements**: Third-party library (Leaflet.js) styles require `!important` to override default themes
- **Specificity Management**: Ensures consistent theming across different browser implementations
- **Third-party Integration**: Common practice when integrating external map libraries that inject their own styles

The `complexity.noImportantStyles` rule is disabled in `biome.json` for this reason.

## TypeScript Migration Tracker

Planning for the TypeScript migration is documented in [`docs/typescript-migration/baseline.md`](./docs/typescript-migration/baseline.md).
It records the pre-migration quality gates, storage keys that must remain stable, and the recommended checkpoints for the multi-phase conversion.

The detailed module-by-module conversion order lives in [`docs/typescript-migration/phase-3-module-conversion-order.md`](./docs/typescript-migration/phase-3-module-conversion-order.md) so contributors can tackle the migration in review-friendly waves.

---

*This project is maintained as a fan project and learning exercise. It uses a modern Vite-based development workflow while keeping the core application logic in TypeScript modules that compile to vanilla JavaScript for the browser.*
