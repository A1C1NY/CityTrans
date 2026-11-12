// 热力图绘制逻辑：与旧版 app.js 完全一致，请勿修改参数。
const STOP_HEATMAP_CLOSE_ZOOM = 12;
const LINE_HEATMAP_CLOSE_ZOOM = 12;
const STOP_HEATMAP_TRANSITION_ZOOM = 4;
const LINE_HEATMAP_TRANSITION_ZOOM = 4;

function heatmapProgress(zoom, closeZoom, transitionZoom) {
  const farZoom = closeZoom - transitionZoom;
  return Math.max(0, Math.min(1, (zoom - farZoom) / transitionZoom));
}

function getStopHeatmapPaint(zoom) {
  const progress = heatmapProgress(
    zoom,
    STOP_HEATMAP_CLOSE_ZOOM,
    STOP_HEATMAP_TRANSITION_ZOOM
  );
  const lerp = (farValue, closeValue) => farValue + (closeValue - farValue) * progress;

  // 站点参数独立维护：保持当前站点图的显示效果。
  return {
    'heatmap-weight': ['*', ['get', 'weight'], lerp(0.55, 1)],
    'heatmap-intensity': lerp(0.5, 0.95),
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(9,31,95,0.7)',
      0.1, 'rgba(9,31,95,0.76)',
      0.25, 'rgba(0,105,148,0.82)',
      0.4, 'rgba(0,156,96,0.86)',
      0.55, 'rgba(102,190,56,0.7)',
      0.7, 'rgba(226,211,29,0.76)',
      0.84, 'rgba(255,133,0,0.84)',
      1, 'rgba(211,32,32,0.9)'
    ],
    'heatmap-radius': lerp(14, 20),
    'heatmap-opacity': lerp(0.89, 0.98)
  };
}

function getLineHeatmapPaint(zoom) {
  const progress = heatmapProgress(
    zoom,
    LINE_HEATMAP_CLOSE_ZOOM,
    LINE_HEATMAP_TRANSITION_ZOOM
  );
  const lerp = (farValue, closeValue) => farValue + (closeValue - farValue) * progress;

  // 线路参数独立维护：线路过红时只调整这里，不影响站点图。
  return {
    'heatmap-weight': ['*', ['get', 'weight'], lerp(0.20, 0.50)],
    'heatmap-intensity': lerp(0.2, 0.35),
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(9,31,95,0.7)',
      0.1, 'rgba(9,31,95,0.76)',
      0.25, 'rgba(0,105,148,0.82)',
      0.4, 'rgba(0,156,96,0.86)',
      0.55, 'rgba(102,190,56,0.7)',
      0.7, 'rgba(226,211,29,0.76)',
      0.84, 'rgba(255,133,0,0.84)',
      1, 'rgba(211,32,32,0.9)'
    ],
    'heatmap-radius': lerp(7, 10),
    'heatmap-opacity': lerp(0.89, 0.98)
  };
}

export function getHeatmapPaint(type, zoom) {
  return type === 'stops'
    ? getStopHeatmapPaint(zoom)
    : getLineHeatmapPaint(zoom);
}

/**
 * 计算请求参数：网格大小随缩放级别收敛，保持与旧版一致。
 */
export function resolveHeatmapRequest(map, requestedGridSize) {
  const bounds = map.getBounds();
  const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
  const zoom = map.getZoom();
  // Finer aggregation at closer zoom levels keeps individual stops and line segments distinct.
  const gridSize = zoom >= 14
    ? Math.min(requestedGridSize, 75)
    : zoom >= 12
      ? Math.min(requestedGridSize, 100)
      : requestedGridSize;
  return { bbox, zoom, gridSize };
}

/**
 * 把 GeoJSON 应用到地图图层，返回网格数量。
 */
export function applyHeatmap(map, type, zoom, geojson) {
  const heatmapPaint = getHeatmapPaint(type, zoom);

  if (!geojson?.features?.length) {
    if (map.getSource('heatmap-data')) {
      map.getSource('heatmap-data').setData(geojson);
    }
    return 0;
  }

  if (map.getSource('heatmap-data')) {
    map.getSource('heatmap-data').setData(geojson);
    if (map.getLayer('heatmap-layer')) {
      Object.entries(heatmapPaint).forEach(([property, value]) => {
        map.setPaintProperty('heatmap-layer', property, value);
      });
    }
  } else {
    map.addSource('heatmap-data', {
      type: 'geojson',
      data: geojson
    });

    map.addLayer({
      id: 'heatmap-layer',
      type: 'heatmap',
      source: 'heatmap-data',
      paint: heatmapPaint
    });
  }

  return geojson.features.length;
}
