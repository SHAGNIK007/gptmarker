import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAnchor } from '../../lib/anchoring';
import { addMarker } from '../../lib/storage';
import { Marker } from '../../types/marker';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  main(ctx) {
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
  },
});

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

function FloatingButton() {
  const [range, setRange] = useState<Range | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      // Delay slightly to let the selection register fully in some edge cases
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const r = selection.getRangeAt(0);
          const rect = r.getBoundingClientRect();
          setRange(r);
          setPosition({
            top: rect.top + window.scrollY - 40,
            left: rect.left + window.scrollX + rect.width / 2,
          });
        }
      }, 10);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setRange(null);
        setPosition(null);
      }
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
      onMouseDown={(e) => e.stopPropagation()}
      onClick={handleMark}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 999999,
        background: '#2563eb',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      Mark
    </button>
  );
}
