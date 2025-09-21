
// Map definitions
const mapDefinitions = {
  forest: {
    name: 'Forest Map',
    imagePath: 'assets/maps/forest.jpg',
    bounds: [[0, 0], [1230, 1230]],
    markersPath: 'assets/data/markers/forest.geojson'
  },
  desert: {
    name: 'Desert Map',
    imagePath: 'assets/maps/desert.jpg',
    bounds: [[0, 0], [1230, 1230]],
    markersPath: 'assets/data/markers/desert.geojson'
  },
  mountains: {
    name: 'Mountains Map',
    imagePath: 'assets/maps/mountains.jpg',
    bounds: [[0, 0], [1230, 1230]],
    markersPath: 'assets/data/markers/mountains.geojson'
  }
};

// Collection state management
class CollectionManager {
  constructor(mapId = 'forest') {
    this.mapId = mapId;
    this.storageKey = `collect-map:v1:${mapId}`;
    this.collectedItems = this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading collection data:', error);
      return {};
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.collectedItems));
    } catch (error) {
      console.error('Error saving collection data:', error);
    }
  }

  isCollected(markerId) {
    return Boolean(this.collectedItems[markerId]);
  }

  toggleCollection(markerId) {
    this.collectedItems[markerId] = !this.isCollected(markerId);
    this.saveToStorage();
    return this.collectedItems[markerId];
  }

  setCollected(markerId, isCollected) {
    this.collectedItems[markerId] = Boolean(isCollected);
    this.saveToStorage();
  }
}

// Map management system
class MapManager {
  constructor() {
    this.currentMapId = 'forest';
    this.collectionManagers = new Map();
    this.markerRefs = new Map();
    this.currentImageOverlay = null;
    this.currentMarkerLayer = null;

    // Initialize map
    this.map = L.map('map', {
      crs: L.CRS.Simple,
      minZoom: -2,
      maxZoom: 2
    });

    // Initialize collection managers for all maps
    Object.keys(mapDefinitions).forEach(mapId => {
      this.collectionManagers.set(mapId, new CollectionManager(mapId));
    });

    // Set up event listeners
    this.setupEventListeners();

    // Load initial map
    this.switchToMap(this.currentMapId);
  }

  setupEventListeners() {
    // Map selector change event
    const mapSelect = document.getElementById('map-select');
    mapSelect.addEventListener('change', (e) => {
      this.switchToMap(e.target.value);
    });

    // Event delegation for popup checkbox interactions
    document.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.hasAttribute('data-marker-id')) {
        const markerId = e.target.getAttribute('data-marker-id');
        this.toggleMarkerCollection(markerId);
      }
    });

    // Debug: Output clicked position coordinates to console
    this.map.on('click', e => {
      const x = Math.round(e.latlng.lng); // horizontal
      const y = Math.round(e.latlng.lat); // vertical
      console.log(`Clicked at: x=${x}, y=${y}`);
    });
  }

  getCurrentCollectionManager() {
    return this.collectionManagers.get(this.currentMapId);
  }

  updateMapTitle(mapId) {
    const titleElement = document.getElementById('map-title-text');
    const mapDef = mapDefinitions[mapId];
    titleElement.textContent = `${mapDef.name} - Daemon X Machina: Titanic Scion`;
  }

  clearCurrentMap() {
    // Remove current image overlay
    if (this.currentImageOverlay) {
      this.map.removeLayer(this.currentImageOverlay);
      this.currentImageOverlay = null;
    }

    // Remove current marker layer
    if (this.currentMarkerLayer) {
      this.map.removeLayer(this.currentMarkerLayer);
      this.currentMarkerLayer = null;
    }

    // Clear marker references
    this.markerRefs.clear();
  }

  switchToMap(mapId) {
    if (!mapDefinitions[mapId]) {
      console.error(`Map definition not found for: ${mapId}`);
      return;
    }

    console.log(`Switching to map: ${mapId}`);

    // Update current map ID
    this.currentMapId = mapId;

    // Update UI
    this.updateMapTitle(mapId);
    document.getElementById('map-select').value = mapId;

    // Clear current map
    this.clearCurrentMap();

    // Load new map
    this.loadMap(mapId);
  }

  loadMap(mapId) {
    const mapDef = mapDefinitions[mapId];

    // Add image overlay
    this.currentImageOverlay = L.imageOverlay(mapDef.imagePath, mapDef.bounds);
    this.currentImageOverlay.addTo(this.map);

    // Set map view
    this.map.fitBounds(mapDef.bounds);

    // Load markers
    this.loadMarkers(mapId, mapDef.markersPath);
  }

  loadMarkers(mapId, markersPath) {
    fetch(markersPath)
      .then(response => response.json())
      .then(data => {
        const collectionManager = this.getCurrentCollectionManager();

        this.currentMarkerLayer = L.geoJSON(data, {
          pointToLayer: (feature, latlng) => {
            const isCollected = collectionManager.isCollected(feature.properties.id);
            const marker = L.marker(latlng, {
              icon: createCategoryIcon(feature.properties.category, 24, isCollected)
            });

            // Store marker reference and feature data
            marker.feature = feature;
            this.markerRefs.set(feature.properties.id, marker);

            return marker;
          },
          onEachFeature: (feature, layer) => {
            const popupContent = this.createPopupContent(feature);
            layer.bindPopup(popupContent);
          }
        });

        this.currentMarkerLayer.addTo(this.map);
        console.log(`GeoJSON markers loaded successfully for ${mapId}`);
      })
      .catch(error => {
        console.error(`Error loading markers for ${mapId}:`, error);
      });
  }

  createPopupContent(feature) {
    const collectionManager = this.getCurrentCollectionManager();
    const isCollected = collectionManager.isCollected(feature.properties.id);
    const checkboxId = `checkbox-${feature.properties.id}`;

    return `
      <div class="marker-popup">
        <h4>${feature.properties.name}</h4>
        <div>ID: ${feature.properties.id}</div>
        <div>Category: ${feature.properties.category}</div>
        <div class="collection-status">
          <label for="${checkboxId}" class="checkbox-label">
            <input type="checkbox" id="${checkboxId}" 
                   data-marker-id="${feature.properties.id}"
                   ${isCollected ? 'checked' : ''}> 
            Collected
          </label>
        </div>
      </div>
    `;
  }

  toggleMarkerCollection(markerId) {
    const collectionManager = this.getCurrentCollectionManager();
    const isNowCollected = collectionManager.toggleCollection(markerId);
    console.log(`Marker ${markerId} collection status: ${isNowCollected}`);

    // Update marker appearance
    const marker = this.markerRefs.get(markerId);
    if (marker) {
      const feature = marker.feature;
      const newIcon = createCategoryIcon(feature.properties.category, 24, isNowCollected);
      marker.setIcon(newIcon);

      // Update popup content
      const newPopupContent = this.createPopupContent(feature);
      marker.setPopupContent(newPopupContent);
    }
  }
}

// Initialize map manager
const mapManager = new MapManager();

console.log('Multi-map system initialized successfully');