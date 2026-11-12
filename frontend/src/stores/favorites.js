import Vue from 'vue';
import { apiRequest } from '../api/client';

export const favoritesState = Vue.observable({
  stopIds: [],
  lineIds: [],
  loaded: false
});

function toIdSet(list) {
  return new Set(list.map((item) => (item.stop || item.line || item).id));
}

export function isStopFavorite(stopId) {
  return favoritesState.stopIds.includes(Number(stopId));
}

export function isLineFavorite(lineId) {
  return favoritesState.lineIds.includes(Number(lineId));
}

export async function loadFavorites() {
  try {
    const [stops, lines] = await Promise.all([
      apiRequest('/me/favorite-stops?page_size=100'),
      apiRequest('/me/favorite-lines?page_size=100')
    ]);
    favoritesState.stopIds = [...toIdSet(stops.items || [])];
    favoritesState.lineIds = [...toIdSet(lines.items || [])];
    favoritesState.loaded = true;
  } catch (error) {
    favoritesState.loaded = true;
  }
}

export function resetFavorites() {
  favoritesState.stopIds = [];
  favoritesState.lineIds = [];
  favoritesState.loaded = false;
}

export async function toggleStopFavorite(stopId) {
  const id = Number(stopId);
  const active = isStopFavorite(id);
  if (active) {
    await apiRequest(`/me/favorite-stops/${id}`, { method: 'DELETE' });
    favoritesState.stopIds = favoritesState.stopIds.filter((item) => item !== id);
  } else {
    await apiRequest(`/me/favorite-stops/${id}`, { method: 'PUT' });
    favoritesState.stopIds = [...favoritesState.stopIds, id];
  }
  return !active;
}

export async function toggleLineFavorite(lineId) {
  const id = Number(lineId);
  const active = isLineFavorite(id);
  if (active) {
    await apiRequest(`/me/favorite-lines/${id}`, { method: 'DELETE' });
    favoritesState.lineIds = favoritesState.lineIds.filter((item) => item !== id);
  } else {
    await apiRequest(`/me/favorite-lines/${id}`, { method: 'PUT' });
    favoritesState.lineIds = [...favoritesState.lineIds, id];
  }
  return !active;
}
