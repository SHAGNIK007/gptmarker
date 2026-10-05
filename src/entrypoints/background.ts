import { browser } from 'wxt/browser';

export default defineBackground(() => {

  // @ts-ignore
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

  browser.runtime.onMessage.addListener((message, sender) => {
    if (message && message.type === 'OPEN_SIDE_PANEL' && sender.tab?.windowId) {
      // @ts-ignore
      browser.sidePanel.open({ windowId: sender.tab.windowId }).catch(console.error);
    }
  });
});
