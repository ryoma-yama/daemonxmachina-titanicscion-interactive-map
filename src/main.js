
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

// Security utilities
/**
 * Validate marker ID format
 */
function validateMarkerId(markerId) {
  if (typeof markerId !== 'string') {
    return false;
  }
  // Allow only alphanumeric characters, hyphens, and underscores with length limit
  const validPattern = /^[a-zA-Z0-9_-]{1,50}$/;
  return validPattern.test(markerId);
}

/**
 * Validate GeoJSON feature data
 */
function validateGeoJSONFeature(feature) {
  // Basic structure check
  if (!feature || typeof feature !== 'object') {
    return false;
  }

  // Required properties existence check
  if (!feature.properties || !feature.geometry) {
    return false;
  }

  const props = feature.properties;

  // Properties validation
  if (!props.id || !props.name || !props.category) {
    return false;
  }

  // ID validation
  if (!validateMarkerId(props.id)) {
    return false;
  }

  // Name validation (length limit, HTML tag exclusion)
  if (typeof props.name !== 'string' ||
    props.name.length === 0 ||
    props.name.length > 100 ||
    /<[^>]*>/g.test(props.name)) {
    return false;
  }

  // Category validation
  const validCategories = ['bgm', 'card', 'chest', 'enemy', 'log'];
  if (!validCategories.includes(props.category)) {
    return false;
  }

  // Coordinate validation
  if (!feature.geometry.coordinates ||
    !Array.isArray(feature.geometry.coordinates) ||
    feature.geometry.coordinates.length !== 2) {
    return false;
  }

  const [x, y] = feature.geometry.coordinates;
  if (typeof x !== 'number' || typeof y !== 'number' ||
    x < 0 || y < 0 || x > 2000 || y > 2000) {
    return false;
  }

  return true;
}

// Collection state management
class CollectionManager {
  constructor(mapId = 'forest') {
    this.mapId = this.validateMapId(mapId);
    this.storageKey = `collect-map:v1:${this.mapId}`;
    this.collectedItems = this.loadFromStorage();
  }

  /**
   * Validate map ID
   */
  validateMapId(mapId) {
    const validMapIds = ['forest', 'desert', 'mountains'];
    if (!validMapIds.includes(mapId)) {
      console.warn(`Invalid mapId: ${mapId}, defaulting to 'forest'`);
      return 'forest';
    }
    return mapId;
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return {};
      }

      const parsed = JSON.parse(stored);

      // Type check: ensure it's an object and not null
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        console.warn('Invalid localStorage data format, resetting to empty object');
        this.clearStorage();
        return {};
      }

      // Properties validation
      const validated = {};
      for (const [key, value] of Object.entries(parsed)) {
        // Marker ID validation and value type check
        if (validateMarkerId(key) && typeof value === 'boolean') {
          validated[key] = value;
        } else {
          console.warn(`Skipping invalid localStorage entry: ${key}=${value}`);
        }
      }

      return validated;
    } catch (error) {
      console.error('Error loading collection data:', error);
      this.clearStorage();
      return {};
    }
  }

  saveToStorage() {
    try {
      // Data size limit (under 5MB)
      const jsonString = JSON.stringify(this.collectedItems);
      if (jsonString.length > 5 * 1024 * 1024) {
        console.error('Collection data too large for localStorage');
        return false;
      }

      localStorage.setItem(this.storageKey, jsonString);
      return true;
    } catch (error) {
      console.error('Error saving collection data:', error);
      // In case of storage quota error, clear old data
      if (error.name === 'QuotaExceededError') {
        this.clearStorage();
      }
      return false;
    }
  }

  /**
   * Clear storage data
   */
  clearStorage() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  isCollected(markerId) {
    if (!validateMarkerId(markerId)) {
      return false;
    }
    return Boolean(this.collectedItems[markerId]);
  }

  toggleCollection(markerId) {
    if (!validateMarkerId(markerId)) {
      console.error(`Invalid marker ID: ${markerId}`);
      return false;
    }

    this.collectedItems[markerId] = !this.isCollected(markerId);
    const saved = this.saveToStorage();

    if (!saved) {
      // If save failed, revert memory changes
      this.collectedItems[markerId] = !this.collectedItems[markerId];
      return false;
    }

    return this.collectedItems[markerId];
  }

  setCollected(markerId, isCollected) {
    if (!validateMarkerId(markerId)) {
      console.error(`Invalid marker ID: ${markerId}`);
      return false;
    }

    this.collectedItems[markerId] = Boolean(isCollected);
    return this.saveToStorage();
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

    // Recording mode state
    this.isRecordingMode = false;
    this.RECORDING_MODE_KEY = 'KeyR'; // R key for Shift+R combination

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
    // Recording mode toggle (Shift+R)
    document.addEventListener('keydown', (e) => {
      // Skip if input element has focus
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      if (e.code === this.RECORDING_MODE_KEY && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        this.toggleRecordingMode();
      }
    });

    // Map navigation link click events
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.map-link');
      if (link) {
        e.preventDefault();
        if (!link.classList.contains('current')) {
          const mapId = link.getAttribute('data-map');
          this.switchToMap(mapId);
        }
      }
    });

    // Event delegation for popup checkbox interactions
    document.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.hasAttribute('data-marker-id')) {
        const markerId = e.target.getAttribute('data-marker-id');

        // Re-validate marker ID
        if (!validateMarkerId(markerId)) {
          console.error(`Invalid marker ID in event: ${markerId}`);
          return;
        }

        this.toggleMarkerCollection(markerId);
      }
    });

    // Map click handler (debug coordinates + recording mode)
    this.map.on('click', e => {
      const x = Math.round(e.latlng.lng); // horizontal
      const y = Math.round(e.latlng.lat); // vertical

      if (this.isRecordingMode) {
        // Recording mode: Output JSON and copy to clipboard
        const output = JSON.stringify({ mapId: this.currentMapId, x: x, y: y });
        console.log(output);

        // Copy to clipboard for use with add_marker.py script
        // Format: python scripts/add_marker.py {map_id} {category} "{name}" {x} {y}
        const clipboardText = `${this.currentMapId} <category> "<name>" ${x} ${y}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(clipboardText)
            .then(() => {
              console.log(`Copied to clipboard: ${clipboardText}`);
            })
            .catch(() => {
              // Silent fail - no fallback as per requirements
            });
        }
      } else {
        // Debug mode: Simple coordinate output
        console.log(`Clicked at: x=${x}, y=${y}`);
      }
    });
  }

  getCurrentCollectionManager() {
    return this.collectionManagers.get(this.currentMapId);
  }

  toggleRecordingMode() {
    this.isRecordingMode = !this.isRecordingMode;
    this.updateRecordingBadge();
    console.log(`Recording mode: ${this.isRecordingMode ? 'ON' : 'OFF'}`);
  }

  updateRecordingBadge() {
    const badge = document.getElementById('rec-badge');
    if (badge) {
      badge.style.display = this.isRecordingMode ? 'block' : 'none';
    }
  }

  getMarkerSize() {
    // Increased marker size for better mobile interaction
    return window.innerWidth <= 768 ? 32 : 28;
  }

  updateMapTitle(mapId) {
    // Update navigation links - remove current class from all links and add to active one
    const mapLinks = document.querySelectorAll('.map-link');
    mapLinks.forEach(link => {
      const linkMapId = link.getAttribute('data-map');
      if (linkMapId === mapId) {
        link.classList.add('current');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('current');
        link.removeAttribute('aria-current');
      }
    });
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

    // Set map view with padding for better initial display
    this.map.fitBounds(mapDef.bounds, {
      padding: [20, 20], // Add 20px padding on all sides
      maxZoom: 1.5 // Prevent over-zooming on initial load
    });

    // Load markers
    this.loadMarkers(mapId, mapDef.markersPath);
  }

  loadMarkers(mapId, markersPath) {
    fetch(markersPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        // Check basic GeoJSON structure
        if (!data || typeof data !== 'object' ||
          data.type !== 'FeatureCollection' ||
          !Array.isArray(data.features)) {
          throw new Error('Invalid GeoJSON structure');
        }

        // Validate each feature
        const validFeatures = data.features.filter((feature, index) => {
          const isValid = validateGeoJSONFeature(feature);
          if (!isValid) {
            console.warn(`Skipping invalid feature at index ${index}:`, feature);
          }
          return isValid;
        });

        console.log(`Loaded ${validFeatures.length} valid features out of ${data.features.length} total for ${mapId}`);

        // Create marker layer with validated data
        const validData = {
          type: 'FeatureCollection',
          features: validFeatures
        };

        const collectionManager = this.getCurrentCollectionManager();

        this.currentMarkerLayer = L.geoJSON(validData, {
          pointToLayer: (feature, latlng) => {
            const isCollected = collectionManager.isCollected(feature.properties.id);
            const markerSize = this.getMarkerSize();
            const marker = L.marker(latlng, {
              icon: createCategoryIcon(feature.properties.category, markerSize, isCollected),
              // Add extra click tolerance for mobile devices
              interactive: true,
              bubblingMouseEvents: false
            });

            // Store marker reference and feature data
            marker.feature = feature;
            this.markerRefs.set(feature.properties.id, marker);

            return marker;
          },
          onEachFeature: (feature, layer) => {
            const popupContent = this.createPopupContent(feature);

            // Enhanced popup configuration for better UX
            const popupOptions = {
              maxWidth: 280,
              minWidth: 220,
              autoPan: true,
              autoPanPadding: [10, 10],
              closeButton: true,
              autoClose: false,
              keepInView: true,
              // Better positioning for mobile
              offset: [0, -10]
            };

            // Add extra padding on mobile devices
            if (window.innerWidth <= 768) {
              popupOptions.autoPanPadding = [20, 20];
              popupOptions.maxWidth = 300;
            }

            layer.bindPopup(popupContent, popupOptions);
          }
        });

        this.currentMarkerLayer.addTo(this.map);
        console.log(`GeoJSON markers loaded successfully for ${mapId}`);
      })
      .catch(error => {
        console.error(`Error loading markers for ${mapId}:`, error);
        // Fallback: Create empty marker layer
        this.currentMarkerLayer = L.geoJSON({ type: 'FeatureCollection', features: [] });
        this.currentMarkerLayer.addTo(this.map);
      });
  }

  createPopupContent(feature) {
    const collectionManager = this.getCurrentCollectionManager();
    const isCollected = collectionManager.isCollected(feature.properties.id);
    const checkboxId = `checkbox-${feature.properties.id}`;

    // Create popup content using safe DOM manipulation
    const container = document.createElement('div');
    container.className = 'marker-popup';

    // Title
    const title = document.createElement('h4');
    title.textContent = feature.properties.name;
    container.appendChild(title);

    // ID display
    const idDiv = document.createElement('div');
    idDiv.textContent = `ID: ${feature.properties.id}`;
    container.appendChild(idDiv);

    // Category display
    const categoryDiv = document.createElement('div');
    categoryDiv.textContent = `Category: ${feature.properties.category}`;
    container.appendChild(categoryDiv);

    // Collection status section
    const statusDiv = document.createElement('div');
    statusDiv.className = 'collection-status';

    const label = document.createElement('label');
    label.htmlFor = checkboxId;
    label.className = 'checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = checkboxId;
    checkbox.setAttribute('data-marker-id', feature.properties.id);
    checkbox.checked = isCollected;

    const labelText = document.createTextNode(' Collected');

    label.appendChild(checkbox);
    label.appendChild(labelText);
    statusDiv.appendChild(label);
    container.appendChild(statusDiv);

    return container.outerHTML;
  }

  toggleMarkerCollection(markerId) {
    const collectionManager = this.getCurrentCollectionManager();
    const isNowCollected = collectionManager.toggleCollection(markerId);
    console.log(`Marker ${markerId} collection status: ${isNowCollected}`);

    // Update marker appearance
    const marker = this.markerRefs.get(markerId);
    if (marker) {
      const feature = marker.feature;
      const markerSize = this.getMarkerSize();
      const newIcon = createCategoryIcon(feature.properties.category, markerSize, isNowCollected);
      marker.setIcon(newIcon);

      // Update checkbox in popup if it's currently open
      const checkboxId = `checkbox-${markerId}`;
      const checkbox = document.getElementById(checkboxId);
      if (checkbox) {
        checkbox.checked = isNowCollected;
      }
    }
  }
}

// Initialize map manager
const mapManager = new MapManager();

console.log('Multi-map system initialized successfully');