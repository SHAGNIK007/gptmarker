export type GotoMessage = {
  type: 'GOTO_MARKER';
  id: string;
};

export type GotoResponse = {
  ok: boolean;
};
