Expose grouped toolbar controls at a configurable workspace edge.

| Metadata    | Value                                                 |
| ----------- | ----------------------------------------------------- |
| Version     | `1.0.0`                                               |
| Provided by | `toolbar`                                             |
| Consumed by | Packages that contribute persistent workspace actions |
| Owner       | `toolbar`                                             |

## Registration

Declare `toolbar` in `consumedServices` and map version `1.0.0` to a consumer method. The consumer receives a function that accepts a non-empty group name and returns a manager for that group.

## Contract

```ts
type GetToolbar = (group: string) => ToolbarManager;

interface ToolbarManager {
  addButton(options: ToolbarButtonOptions): ToolbarButton;
  addSpacer(options?: { priority?: number }): ToolbarItem;
  addItem(options: { element: HTMLElement; priority?: number }): ToolbarItem;
  removeItems(): void;
  onDidDestroy(callback: () => void): Disposable;
}

interface ToolbarButtonOptions {
  callback: string | string[] | ((data: unknown, target: HTMLElement) => void);
  icon?: string;
  iconset?: "ion" | "fa" | "fab" | "fi" | "icomoon" | "devicon" | "mdi";
  text?: string;
  tooltip?: string | object;
  priority?: number;
  data?: unknown;
  class?: string | string[];
}
```

## Minimal example

```js
consumeToolbar(getToolbar) {
  this.toolbar = getToolbar("my-package");
  this.toolbar.addButton({
    icon: "gear",
    tooltip: "Open settings",
    callback: "settings-view:open",
  });
}
```

## Behavior

Priorities order controls globally. Negative priorities also align controls at the trailing edge. Modifier callback maps use combinations of `alt`, `ctrl`, and `shift`, with the empty key as the default action.

## Teardown

Consumers call `removeItems()` during deactivation. Individual returned items may also be destroyed. The `onDidDestroy` subscription lets consumers react when the provider itself deactivates.

## Versioning

Additive option fields remain compatible within `1.x`. Removing methods, changing callback arguments, or changing returned item behavior requires a new major service version.
