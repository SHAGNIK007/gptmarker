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
  const docRoot = document.body;
  
  const startRange = document.createRange();
  try {
    startRange.setStart(docRoot, 0);
    startRange.setEnd(range.startContainer, range.startOffset);
  } catch (e) {
    return { text: range.toString(), before: '', after: '' };
  }
  
  const startIndex = (startRange.cloneContents().textContent || '').length;
  const text = range.cloneContents().textContent || '';
  const endIndex = startIndex + text.length;
  
  const fullString = docRoot.textContent || '';
  
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
  
  let startIndex = -1;
  let endIndex = -1;

  // 1. Try exact match with context
  const exactString = marker.before + marker.text + marker.after;
  const exactMatch = fullString.indexOf(exactString);
  if (exactMatch !== -1) {
    startIndex = exactMatch + marker.before.length;
    endIndex = startIndex + marker.text.length;
  } else {
    // 2. Fallback to text alone
    const textMatch = fullString.indexOf(marker.text);
    if (textMatch !== -1) {
      startIndex = textMatch;
      endIndex = startIndex + marker.text.length;
    } else {
      // 3. Fuzzy fallback (ignore whitespace)
      const strippedChars: string[] = [];
      const originalIndices: number[] = [];
      // strip all common whitespace and zero-width characters
      const wsRegex = /[\s\u200B-\u200D\uFEFF]/;
      for (let i = 0; i < fullString.length; i++) {
        if (!wsRegex.test(fullString[i])) {
          strippedChars.push(fullString[i]);
          originalIndices.push(i);
        }
      }
      
      const strippedText = marker.text.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
      if (strippedText.length > 0) {
        const strippedFullString = strippedChars.join('');
        const strippedMatch = strippedFullString.indexOf(strippedText);
        
        if (strippedMatch !== -1) {
          startIndex = originalIndices[strippedMatch];
          endIndex = originalIndices[strippedMatch + strippedText.length - 1] + 1;
        }
      }
    }
  }
  
  if (startIndex === -1 || endIndex === -1) return null;
  
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
