// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createAnchor, findAnchor } from './anchoring';
import { Marker } from '../types/marker';

describe('Anchoring', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);
  });

  function createTextNode(text: string) {
    const node = document.createTextNode(text);
    root.appendChild(node);
    return node;
  }

  function createRange(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  it('createAnchor extracts text, before, and after contexts', () => {
    root.innerHTML = 'This is a long prefix context. Here is the selected text. And this is a long suffix context.';
    const node = root.firstChild!;
    const range = createRange(node, 31, node, 56);
    
    const anchor = createAnchor(range);
    expect(anchor.text).toBe('Here is the selected text');
    expect(anchor.before.endsWith('prefix context. ')).toBe(true);
    expect(anchor.after.startsWith('. And this is a')).toBe(true);
  });

  it('findAnchor exact match with context', () => {
    root.innerHTML = 'Prefix. Target text. Suffix.';
    const marker: Marker = {
      id: '1', chatUrl: 'x', createdAt: 0,
      text: 'Target text', before: 'Prefix. ', after: '. Suffix.'
    };
    const range = findAnchor(root, marker);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('Target text');
  });

  it('findAnchor context fallback (text matches, but context changed slightly)', () => {
    root.innerHTML = 'Changed prefix. Target text. Changed suffix.';
    const marker: Marker = {
      id: '1', chatUrl: 'x', createdAt: 0,
      text: 'Target text', before: 'Old prefix. ', after: '. Old suffix.'
    };
    const range = findAnchor(root, marker);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('Target text');
  });

  it('findAnchor text appearing multiple times uses context to find correct one', () => {
    root.innerHTML = 'First. Target text. Second. Target text. Third.';
    const marker: Marker = {
      id: '1', chatUrl: 'x', createdAt: 0,
      text: 'Target text', before: 'Second. ', after: '. Third.'
    };
    const range = findAnchor(root, marker);
    expect(range).not.toBeNull();
    
    // Check if it grabbed the second one by checking offsets
    const expectedStartOffset = root.textContent!.lastIndexOf('Target text');
    
    // To verify exactly which one, we check if the range starts near the end
    expect(range?.startOffset === expectedStartOffset || range?.startContainer === root.firstChild).toBeTruthy();
    // Since it's a single text node in this simple HTML, let's just make sure it found the right string index
    expect(range?.startOffset).toBe(28); 
  });

  it('findAnchor returns null if text not found', () => {
    root.innerHTML = 'Some completely different text.';
    const marker: Marker = {
      id: '1', chatUrl: 'x', createdAt: 0,
      text: 'Target text', before: 'Prefix ', after: ' Suffix'
    };
    const range = findAnchor(root, marker);
    expect(range).toBeNull();
  });

  it('findAnchor matches text split across multiple DOM nodes', () => {
    root.innerHTML = 'Prefix. <b>Tar</b><i>get </i><span>text</span>. Suffix.';
    const marker: Marker = {
      id: '1', chatUrl: 'x', createdAt: 0,
      text: 'Target text', before: 'Prefix. ', after: '. Suffix.'
    };
    const range = findAnchor(root, marker);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('Target text');
  });
});
