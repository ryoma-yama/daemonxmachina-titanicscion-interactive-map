# AGENTS.md for Daemon X Machina: Titanic Scion Interactive Map

## Project Overview
This is an interactive web-based map application for the game "Daemon X Machina: Titanic Scion" that allows users to track collectible items (dungeons, logs, cards, etc.) across multiple game maps. Users can click markers to toggle collection status, with state persisted in localStorage.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/TypeScript (ES modules)
- **Build Tool**: Vite
- **Map Library**: Leaflet.js v1.9.4 (npm package)
- **Data Storage**: Browser localStorage
- **Coordinate System**: Leaflet's L.CRS.Simple (pixel-based, not lat/lng)
- **Data Format**: GeoJSON for marker definitions
- **Icons**: SVG icons with CSS mask-based coloring
  - Uses custom `L.divIcon` with SVG content exclusively
  - Leaflet default marker icons are **not used** in this application
- **Testing**: Playwright (E2E), Vitest (Unit)
- **Linting/Formatting**: Biome
- **Package Manager**: pnpm

## Project Structure
```
/
├── index.html              # Main HTML entry point
├── about.html              # About page with credits
├── README.md              # Comprehensive project documentation  
├── LICENSE                # MIT License file
├── package.json           # Package dependencies and scripts
├── pnpm-lock.yaml         # Package lock file
├── vite.config.ts         # Vite configuration (TypeScript)
├── tsconfig.json          # TypeScript configuration
├── tsconfig.node.json     # Node TypeScript configuration
├── vitest.config.js       # Vitest unit test configuration
├── playwright.config.js   # Playwright E2E test configuration
├── biome.json             # Biome configuration
├── public/                # Static assets
│   ├── site.webmanifest   # Web app manifest
│   ├── favicon files      # Various favicon formats
│   └── assets/            # Game assets
│       ├── data/markers/  # Marker definitions (GeoJSON)
│       ├── icons/         # SVG icons for categories
│       └── maps/          # Game map images (JPEG)
├── scripts/               # TypeScript utilities
│   ├── add_marker.ts      # TypeScript utility for adding markers
│   ├── audit_geojson_numbers.ts # GeoJSON audit script
│   └── batch_add_markers.ts # Batch marker addition utility
├── tests/                 # Test files
│   ├── *.spec.ts          # Playwright E2E tests
│   ├── *.test.ts          # Unit tests
│   └── fixtures/          # Test fixtures and helpers
└── src/                   # Source code (TypeScript)
    ├── main.ts            # Application entry point
    ├── about.ts           # About page functionality
    ├── app-controller.ts  # Main application controller
    ├── map-view.ts        # Map rendering and interaction
    ├── map-definitions.ts # Map configuration data
    ├── collection-store.ts # Data persistence layer
    ├── preferences-store.ts # User preferences storage
    ├── filter-manager.ts  # Filter logic management
    ├── filter-pane.ts     # Filter UI component
    ├── search-panel.ts    # Search functionality
    ├── url-state.ts       # URL state management
    ├── icons.ts           # Icon creation utilities
    ├── validation.ts      # Data validation utilities
    ├── asset-path.ts      # Asset path utilities
    ├── constants.ts       # Application constants
    ├── styles.css         # Main stylesheet
    ├── data/              # JSON data files
    │   └── category-colors.json # Category color definitions
    └── types/             # TypeScript type definitions
        └── *.ts           # Type definition files
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
- Colors defined in fluorescent palette in `src/data/category-colors.json`
- Icon creation handled by `src/icons.ts` module

### Data Persistence
- localStorage keys format: `collect-map:v1:{mapId}`
- Storage format: `{ markerId: true/false }` for collection status
- Handled by `collection-store.ts` module
- User preferences stored via `preferences-store.ts`
- URL state management via `url-state.ts`

### New Features
- **Search Panel**: Text-based marker search with real-time filtering
- **Filter System**: Category-based filtering with show/hide collected toggle
- **Map Navigation**: Multi-map support (Forest, Desert, Mountains)
- **URL State**: Shareable URLs for specific markers and map states
- **Preferences**: Persistent user settings for filters and display options
- **Mobile Support**: Responsive design optimized for touch devices

## Development Guidelines

### Code Style
- Use TypeScript modules with ES2022 syntax
- Prefer explicit types for public exports; allow inference for narrow-scope locals when it keeps intent clear
- Console logging for debugging is standard practice
- Use descriptive variable names in English
- Keep shared type definitions in `src/types/` so modules can import stable contracts
- Follow existing code style and patterns using Biome for formatting and linting

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
- **Unit Tests**: Run `pnpm test` (Vitest)
- **E2E Tests**: Run `pnpm exec playwright test` (Playwright)
- **Type Checking**: Run `pnpm typecheck` for TypeScript validation

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
1. Add entry to appropriate `public/assets/data/markers/{map}.geojson` file
2. Ensure category exists in `src/data/category-colors.json`
3. Add corresponding SVG icon to `public/assets/icons/` if new category
4. Use TypeScript script: `pnpm tsx scripts/add_marker.ts` for batch additions

### Adding New Maps
1. Add image to `public/assets/maps/`
2. Update `mapDefinitions` in `src/map-definitions.ts`
3. Create corresponding GeoJSON file in `public/assets/data/markers/`
4. Map switching is already implemented via dropdown

### Auditing Markers
- Use `pnpm audit-geojson` script to detect numbering gaps and export reports
- Supports filtering by category and numeric range validation

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
- Run `pnpm typecheck` for TypeScript type validation
- Run `pnpm test` and `pnpm exec playwright test` to ensure all tests pass
- Test changes across different browsers and ensure mobile compatibility
- Verify no unnecessary diffs are introduced, then commit with conventional commits and open a PR
