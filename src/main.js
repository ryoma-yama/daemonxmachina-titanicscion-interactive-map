
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

// Initialize collection manager
const collectionManager = new CollectionManager();

// 地図の初期化
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2
});

// 画像のサイズに基づいたboundsの設定
// 画像サイズ: 1230x1230ピクセル
const bounds = [[0, 0], [1230, 1230]];

// imageOverlayで森のマップを表示
L.imageOverlay('assets/maps/forest.jpg', bounds).addTo(map);

// 地図の初期表示位置を画像の中央に設定
map.fitBounds(bounds);

// Store marker references for updating
const markerRefs = new Map();

// Function to create popup content with checkbox
function createPopupContent(feature) {
  const isCollected = collectionManager.isCollected(feature.properties.id);
  const checkboxId = `checkbox-${feature.properties.id}`;

  return `
    <div class="marker-popup">
      <h4>${feature.properties.name}</h4>
      <div>ID: ${feature.properties.id}</div>
      <div>カテゴリ: ${feature.properties.category}</div>
      <div class="collection-status">
        <label for="${checkboxId}" class="checkbox-label">
          <input type="checkbox" id="${checkboxId}" 
                 ${isCollected ? 'checked' : ''} 
                 onchange="toggleMarkerCollection(${feature.properties.id})">
          収集済み
        </label>
      </div>
    </div>
  `;
}

// Function to handle checkbox toggle
function toggleMarkerCollection(markerId) {
  const isNowCollected = collectionManager.toggleCollection(markerId);
  console.log(`Marker ${markerId} collection status: ${isNowCollected}`);

  // Update marker appearance
  const marker = markerRefs.get(markerId);
  if (marker) {
    const feature = marker.feature;
    const newIcon = createCategoryIcon(feature.properties.category, 24, isNowCollected);
    marker.setIcon(newIcon);

    // Update popup content
    const newPopupContent = createPopupContent(feature);
    marker.setPopupContent(newPopupContent);
  }
}

// Make function globally accessible
window.toggleMarkerCollection = toggleMarkerCollection;

// GeoJSONからマーカーデータを読み込み、地図に表示
fetch('assets/data/markers.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const isCollected = collectionManager.isCollected(feature.properties.id);
        const marker = L.marker(latlng, {
          icon: createCategoryIcon(feature.properties.category, 24, isCollected)
        });

        // Store marker reference and feature data
        marker.feature = feature;
        markerRefs.set(feature.properties.id, marker);

        return marker;
      },
      onEachFeature: (feature, layer) => {
        const popupContent = createPopupContent(feature);
        layer.bindPopup(popupContent);
      }
    }).addTo(map);

    console.log('GeoJSON markers loaded successfully');
  })
  .catch(error => {
    console.error('Error loading markers:', error);
  });

// デバッグ用: マップをクリックした位置の座標をコンソールに出力
map.on('click', e => {
  const x = Math.round(e.latlng.lng); // 横
  const y = Math.round(e.latlng.lat); // 縦
  console.log(`Clicked at: x=${x}, y=${y}`);
});

console.log('Leaflet map initialized successfully with CRS.Simple');