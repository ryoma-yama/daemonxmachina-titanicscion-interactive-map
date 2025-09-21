// Fluorescent color definitions
const colors = {
  bgm: '#00FFFF',
  card: '#39FF14',
  chest: '#FFFF00',
  enemy: '#FF00FF',
  log: '#FF6E00'
};

// DivIcon that uses SVG as mask and colors with background color
function createCategoryIcon(category, size = 24, isCollected = false) {
  const color = colors[category] || '#FFFFFF';
  const url = `assets/icons/${category}.svg`;

  // Collection state styling
  const opacity = isCollected ? 0.5 : 1.0;
  const filter = isCollected ? 'grayscale(50%)' : 'none';
  const border = isCollected ? '2px solid #00FF00' : 'none';

  const html = `
    <div style="
      width:${size}px;height:${size}px;background-color:${color};
      -webkit-mask:url('${url}') center / contain no-repeat;
      mask:url('${url}') center / contain no-repeat;
      opacity:${opacity};
      filter:${filter};
      border:${border};
      border-radius:50%;
      box-sizing:border-box;
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