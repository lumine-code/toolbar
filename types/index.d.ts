export type ToolbarCallback =
  | string
  | string[]
  | ((data: unknown, target: HTMLElement) => void)
  | Record<string, string | string[] | ((data: unknown, target: HTMLElement) => void)>;

export interface ToolbarButtonOptions {
  icon?: string;
  iconset?: "ion" | "fa" | "fab" | "fi" | "icomoon" | "devicon" | "mdi";
  text?: string;
  html?: boolean;
  callback: ToolbarCallback;
  data?: unknown;
  priority?: number;
  tooltip?: string | Record<string, unknown>;
  color?: string;
  background?: string;
  class?: string | string[];
}

export interface ToolbarItemOptions {
  element: HTMLElement;
  priority?: number;
}

export interface ToolbarItem {
  element: HTMLElement;
  priority?: number;
  group: string;
  destroy(): void;
}

export interface ToolbarButton extends ToolbarItem {
  setEnabled(enabled: boolean): void;
  setSelected(selected: boolean): void;
  getSelected(): boolean;
}

export interface ToolbarManager {
  addButton(options: ToolbarButtonOptions): ToolbarButton;
  addSpacer(options?: { priority?: number }): ToolbarItem;
  addItem(options: ToolbarItemOptions): ToolbarItem;
  removeItems(): void;
  onDidDestroy(callback: () => void): { dispose(): void };
}

export type GetToolbar = (group: string) => ToolbarManager;
