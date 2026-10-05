import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAnchor, findAnchor } from '../lib/anchoring';
import { addMarker, getMarkers } from '../lib/storage';
import { GotoMessage, GotoResponse } from '../lib/messaging';
import { browser } from 'wxt/browser';
import { Marker } from '../types/marker';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  main(ctx) {

    
    browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
      const msg = message as GotoMessage;
      if (msg.type === 'GOTO_MARKER') {
        handleGotoMarker(msg.id).then(sendResponse);
        return true;
      }
    });


    const ui = createShadowRootUi(ctx, {
      name: 'chat-marker-ui',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        const root = createRoot(container);
        root.render(<FloatingButton />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.then(u => u.mount());
    restoreHighlights();
  },
});

async function restoreHighlights() {
  const currentUrl = window.location.href.split('#')[0];
  const allMarkers = await getMarkers();
  let pendingMarkers = allMarkers.filter(m => m.chatUrl.split('#')[0] === currentUrl);

  if (pendingMarkers.length === 0) return;

  let observer: MutationObserver | null = null;

  const tryHighlight = () => {
    const remaining: Marker[] = [];
    for (const marker of pendingMarkers) {
      const range = findAnchor(document.body, marker);
      if (range) {
        highlightRange(range);
      } else {
        remaining.push(marker);
      }
    }
    pendingMarkers = remaining;
    if (pendingMarkers.length === 0 && observer) {
      observer.disconnect();
    }
  };

  tryHighlight();
  if (pendingMarkers.length === 0) return;

  observer = new MutationObserver(() => {
    tryHighlight();
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  setTimeout(() => {
    if (observer) {
      observer.disconnect();

    }
  }, 15000);
}

function highlightRange(range: Range) {
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  
  const nodesToWrap: Text[] = [];
  let node;
  while ((node = walker.nextNode())) {
    if (range.intersectsNode(node)) {
      nodesToWrap.push(node as Text);
    }
  }

  if (nodesToWrap.length > 0) {
    if (nodesToWrap[0] === range.startContainer) {
      nodesToWrap[0] = nodesToWrap[0].splitText(range.startOffset);
    }
    const lastNode = nodesToWrap[nodesToWrap.length - 1];
    if (lastNode === range.endContainer) {
      lastNode.splitText(range.endOffset);
    }
    
    for (const textNode of nodesToWrap) {
      if (!textNode.textContent?.trim()) continue;
      const mark = document.createElement('mark');
      mark.style.backgroundColor = 'rgba(251, 191, 36, 0.4)';
      mark.style.color = 'inherit';
      textNode.parentNode?.insertBefore(mark, textNode);
      mark.appendChild(textNode);
    }
  }
}

async function handleGotoMarker(id: string): Promise<GotoResponse> {
  const markers = await getMarkers();
  const marker = markers.find(m => m.id === id);
  if (!marker) return { ok: false };

  const range = findAnchor(document.body, marker);
  if (!range) return { ok: false };

  const span = document.createElement('span');
  range.insertNode(span);
  span.scrollIntoView({ behavior: 'smooth', block: 'center' });
  span.remove();

  flashHighlight(range);
  return { ok: true };
}

function flashHighlight(range: Range) {
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  
  const nodesToWrap: Text[] = [];
  let node;
  while ((node = walker.nextNode())) {
    if (range.intersectsNode(node)) {
      nodesToWrap.push(node as Text);
    }
  }

  if (nodesToWrap.length === 0) return;

  if (nodesToWrap[0] === range.startContainer) {
    nodesToWrap[0] = nodesToWrap[0].splitText(range.startOffset);
  }
  const lastNode = nodesToWrap[nodesToWrap.length - 1];
  if (lastNode === range.endContainer) {
    lastNode.splitText(range.endOffset);
  }
  
  const marks: HTMLElement[] = [];
  for (const textNode of nodesToWrap) {
    if (!textNode.textContent?.trim()) continue;
    const mark = document.createElement('mark');
    mark.style.backgroundColor = 'rgba(251, 191, 36, 0.8)';
    mark.style.color = 'inherit';
    mark.style.transition = 'background-color 1.5s ease-out';
    textNode.parentNode?.insertBefore(mark, textNode);
    mark.appendChild(textNode);
    marks.push(mark);
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      marks.forEach(mark => {
        mark.style.backgroundColor = 'transparent';
      });
    });
  });

  setTimeout(() => {
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
      }
    });
  }, 1500);
}

function FloatingButton() {
  const [range, setRange] = useState<Range | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const text = selection.toString().trim();
          if (!text) return;

          
          const r = selection.getRangeAt(0);
          const rect = r.getBoundingClientRect();
          setRange(r);
          // Use fixed positioning so we don't need scroll offsets
          setPosition({
            top: rect.top - 40,
            left: rect.left + rect.width / 2,
          });

        }
      }, 0);
    };

    const handleSelectionChange = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setRange(null);
          setPosition(null);
        }
      }, 0);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleMark = async () => {
    if (!range) return;
    const { text, before, after } = createAnchor(range);
    
    const marker: Marker = {
      id: crypto.randomUUID(),
      chatUrl: window.location.href,
      text,
      before,
      after,
      createdAt: Date.now()
    };
    
    await addMarker(marker);

    highlightRange(range);
    
    setRange(null);
    setPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!position) return null;

  return (
    <button
      onMouseDown={(e) => {
        // Crucial: prevent default so the browser doesn't clear the selection!
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={handleMark}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 2147483647, // very high z-index
        background: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      Mark
    </button>
  );
}
