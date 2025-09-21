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
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Map Library**: [Leaflet.js](https://leafletjs.com/) v1.9.4 (via CDN)
- **Data Storage**: Browser localStorage
- **Coordinate System**: Leaflet's L.CRS.Simple (pixel-based, not lat/lng)
- **Data Format**: GeoJSON for marker definitions
- **Icons**: SVG icons with CSS mask-based coloring

## Key Technical Concepts
- **Coordinate System**: Uses `L.CRS.Simple` instead of geographic coordinates
- **Map Implementation**: Images loaded via `L.imageOverlay(imagePath, bounds)`
- **Marker System**: Defined in GeoJSON format with properties: `id`, `name`, `category`
- **Data Persistence**: localStorage keys format: `collect-map:v1:{mapId}`

## Development Setup

### Local Development
1. Clone this repository
2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```
3. Open `http://localhost:8000` in your browser

### Browser Compatibility
- Modern browsers with ES6+ support
- Local storage must be enabled
- JavaScript must be enabled

## Adding New Content

### Adding New Markers
1. Add entry to appropriate `assets/data/markers/{map}.geojson` file
2. Ensure category exists in `colors` object in `src/icons.js`
3. Add corresponding SVG icon to `assets/icons/` if new category

### Adding New Maps
1. Add image to `assets/maps/`
2. Update `mapDefinitions` in `src/main.js`
3. Create corresponding GeoJSON file in `assets/data/markers/`

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
- Use vanilla JavaScript (ES6+)
- Console logging for debugging is standard practice
- Follow existing code style and patterns
- Test changes across different browsers
- Ensure mobile compatibility

## Support
For issues related to:
- **Game content**: Contact Marvelous Inc. official support
- **This tool**: Create an issue in this repository

---

*This project is maintained as a fan project and learning exercise. It follows a lightweight, static-file architecture for easy deployment and maintenance.*
