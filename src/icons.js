// 蛍光色カラー定義
const colors = {
  bgm: '#00FFFF',
  card: '#39FF14',
  chest: '#FFFF00',
  enemy: '#FF00FF',
  log: '#FF6E00'
};

// SVGをマスクにして背景色で着色するDivIcon
function createCategoryIcon(category, size = 24) {
  const color = colors[category] || '#FFFFFF';
  const url = `assets/icons/${category}.svg`;
  const html = `
    <div style="
      width:${size}px;height:${size}px;background-color:${color};
      -webkit-mask:url('${url}') center / contain no-repeat;
      mask:url('${url}') center / contain no-repeat;
      ">
    </div>`;
  return L.divIcon({
    html,
    className: 'dmx-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}