export type GotoMessage = {
  type: 'GOTO_MARKER';
  id: string;
};

export type GotoResponse = {
  ok: boolean;
};

export type OpenSidePanelMessage = {
  type: 'OPEN_SIDE_PANEL';
};

export type ExtensionMessage = GotoMessage | OpenSidePanelMessage;
