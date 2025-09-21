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

// GeoJSONからマーカーデータを読み込み、地図に表示
fetch('assets/data/markers.geojson')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, {
          icon: createCategoryIcon(feature.properties.category)
        });
      },
      onEachFeature: (feature, layer) => {
        const popupContent = `
          <h4>${feature.properties.name}</h4>
          <div>ID: ${feature.properties.id}</div>
          <div>カテゴリ: ${feature.properties.category}</div>
        `;
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