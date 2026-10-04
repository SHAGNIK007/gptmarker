import { storage } from 'wxt/storage';
import { Marker, MarkerSchema } from '../types/marker';

const MARKERS_KEY = 'local:markers';

export async function getMarkers(chatUrl?: string): Promise<Marker[]> {
  const data = await storage.getItem<Marker[]>(MARKERS_KEY);
  let markers = data || [];
  
  if (chatUrl) {
    markers = markers.filter(m => m.chatUrl === chatUrl);
  }
  
  // Validate and parse, ignoring invalid ones to prevent corruption from breaking the app
  return markers.filter(m => MarkerSchema.safeParse(m).success);
}

export async function addMarker(marker: Marker): Promise<void> {
  const current = await getMarkers();
  current.push(marker);
  await storage.setItem(MARKERS_KEY, current);
}

export async function deleteMarker(id: string): Promise<void> {
  const current = await getMarkers();
  const updated = current.filter(m => m.id !== id);
  await storage.setItem(MARKERS_KEY, updated);
}

export function subscribeToMarkers(callback: (markers: Marker[]) => void) {
  return storage.watch<Marker[]>(MARKERS_KEY, (newMarkers) => {
    callback(newMarkers || []);
  });
}
