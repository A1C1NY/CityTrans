import maplibregl from 'maplibre-gl';

export const DEFAULT_CENTER = [121.475108, 31.232687];

export function createMap(container, center = DEFAULT_CENTER, zoom = 12) {
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center,
    zoom
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  return map;
}

export function removeLayerAndSource(map, id) {
  if (!map) return;
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(id)) map.removeSource(id);
}

export function fitToCoordinates(map, coordinates, padding = 50) {
  if (!map || !coordinates.length) return;
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach((coord) => bounds.extend(coord));
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding });
}

export { maplibregl };
