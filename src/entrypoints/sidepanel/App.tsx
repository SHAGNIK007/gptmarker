import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { browser } from 'wxt/browser';
import { GotoMessage, GotoResponse } from '../../lib/messaging';

export default function App() {
  const { markers, activeChatUrl, init, removeMarker, editMarker } = useStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  const handleGoto = async (id: string) => {
    setErrorMsg(null);
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const message: GotoMessage = { type: 'GOTO_MARKER', id };
        const res = await browser.tabs.sendMessage(tabs[0].id, message) as GotoResponse;
        if (!res || !res.ok) {
          setErrorMsg('Text not found on page.');
          setTimeout(() => setErrorMsg(null), 3000);
        }
      }
    } catch (e) {
      setErrorMsg('Could not send message. Please reload the page.');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  if (!activeChatUrl) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Please open a chatgpt.com page to see your markers.
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col min-h-screen bg-gray-50">
      <h1 className="text-lg font-bold mb-4 text-gray-800">Chat Markers</h1>
      
      {errorMsg && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 text-sm rounded border border-red-200">
          {errorMsg}
        </div>
      )}

      {markers.length === 0 ? (
        <div className="text-gray-500 text-sm">
          No markers saved for this chat. Select text and click "Mark" to add one!
        </div>
      ) : (
        <ul className="space-y-3">
          {markers.map((marker) => (
            <li key={marker.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              {!marker.heading ? (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name this marker:</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Important API fix"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        editMarker(marker.id, e.currentTarget.value.trim() || 'Untitled');
                      }
                    }}
                    onBlur={(e) => {
                      if (e.currentTarget.value.trim()) {
                        editMarker(marker.id, e.currentTarget.value.trim());
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <h3 className="font-bold text-gray-800 text-sm mb-1">{marker.heading}</h3>
              )}
              <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                "{marker.text}"
              </p>
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={() => handleGoto(marker.id)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Go to
                </button>
                <button
                  onClick={() => removeMarker(marker.id)}
                  className="px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
