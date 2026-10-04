import { Marker } from '../types/marker';

function getTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node as Text);
  }
  return nodes;
}

export function createAnchor(range: Range): { text: string, before: string, after: string } {
  const text = range.toString();
  const docRoot = range.commonAncestorContainer.ownerDocument?.body || document.body;
  const allTextNodes = getTextNodes(docRoot);
  
  let fullString = '';
  let startIndex = -1;
  let endIndex = -1;
  
  for (const node of allTextNodes) {
    if (node === range.startContainer) {
      startIndex = fullString.length + range.startOffset;
    }
    if (node === range.endContainer) {
      endIndex = fullString.length + range.endOffset;
    }
    fullString += node.textContent || '';
  }

  // Fallbacks if start/end aren't directly in text nodes (e.g. if the selection was an element)
  // To keep it simple and robust, we assume the selection ends up on text nodes as is typical.
  if (startIndex === -1 || endIndex === -1) {
    return { text, before: '', after: '' };
  }
  
  const before = fullString.substring(Math.max(0, startIndex - 30), startIndex);
  const after = fullString.substring(endIndex, endIndex + 30);
  
  return { text, before, after };
}

export function findAnchor(root: HTMLElement, marker: Pick<Marker, 'text' | 'before' | 'after'>): Range | null {
  const allTextNodes = getTextNodes(root);
  if (allTextNodes.length === 0) return null;

  let fullString = '';
  const map: { node: Text; startOffset: number }[] = [];
  
  for (const node of allTextNodes) {
    map.push({ node, startOffset: fullString.length });
    fullString += node.textContent || '';
  }
  
  let matchIndex = -1;
  
  // Try before + text + after first
  const exactString = marker.before + marker.text + marker.after;
  const exactMatch = fullString.indexOf(exactString);
  if (exactMatch !== -1) {
    matchIndex = exactMatch + marker.before.length;
  } else {
    // Fallback to text alone
    matchIndex = fullString.indexOf(marker.text);
  }
  
  if (matchIndex === -1) return null;
  
  const startIndex = matchIndex;
  const endIndex = matchIndex + marker.text.length;
  
  function getPosition(index: number): { node: Text; offset: number } | null {
    for (let i = map.length - 1; i >= 0; i--) {
      const nodeStart = map[i].startOffset;
      const nodeLength = map[i].node.length;
      // We check if index falls within this node's bounds
      // We use >= nodeStart, and strictly <= nodeStart + nodeLength
      // so we don't accidentally fall off the end of the node's text.
      if (index >= nodeStart && index <= nodeStart + nodeLength) {
        return {
          node: map[i].node,
          offset: index - nodeStart
        };
      }
    }
    return null;
  }
  
  const startPos = getPosition(startIndex);
  const endPos = getPosition(endIndex);
  
  if (!startPos || !endPos) return null;
  
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  
  return range;
}
