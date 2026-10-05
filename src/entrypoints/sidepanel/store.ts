import { create } from 'zustand';
import { Marker } from '../../types/marker';
import { getMarkers, subscribeToMarkers, deleteMarker } from '../../lib/storage';
import { browser } from 'wxt/browser';

interface SidePanelState {
  markers: Marker[];
  activeChatUrl: string | null;
  init: () => () => void;
  removeMarker: (id: string) => Promise<void>;
}

export const useStore = create<SidePanelState>((set, get) => {
  const updateMarkers = async () => {
    const { activeChatUrl } = get();
    const allMarkers = await getMarkers();
    if (!activeChatUrl) {
      set({ markers: [] });
      return;
    }
    const baseActiveUrl = activeChatUrl.split('#')[0];
    const markers = allMarkers.filter(m => m.chatUrl.split('#')[0] === baseActiveUrl);
    markers.sort((a, b) => b.createdAt - a.createdAt);
    set({ markers });
  };

  const updateActiveTab = async () => {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab && tab.url && tab.url.startsWith('https://chatgpt.com')) {
        set({ activeChatUrl: tab.url });
      } else {
        set({ activeChatUrl: null });
      }
    } catch (e) {
      set({ activeChatUrl: null });
    }
    await updateMarkers();
  };

  return {
    markers: [],
    activeChatUrl: null,

    init: () => {
      updateActiveTab();
      const onActivated = () => updateActiveTab();
      const onUpdated = (tabId: number, changeInfo: any) => {
        if (changeInfo.url) updateActiveTab();
      };
      
      browser.tabs.onActivated.addListener(onActivated);
      browser.tabs.onUpdated.addListener(onUpdated);

      const unwatch = subscribeToMarkers(() => updateMarkers());

      return () => {
        browser.tabs.onActivated.removeListener(onActivated);
        browser.tabs.onUpdated.removeListener(onUpdated);
        unwatch();
      };
    },

    removeMarker: async (id: string) => {
      await deleteMarker(id);
    }
  };
});
