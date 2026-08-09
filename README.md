# toolbar

Provide an extensible toolbar docked to the workspace edge.

## Features

- **Left-edge default**: starts as a compact vertical toolbar beside the workspace.
- **Flexible docking**: moves to any edge and supports full-width top and bottom layouts.
- **Grouped service API**: lets packages add and remove their own buttons, spacers, and elements.
- **Rich controls**: supports built-in and bundled icon sets, text, tooltips, state, colors, and modifier actions.
- **Predictable cleanup**: disposes commands, tooltips, controls, panels, animation frames, and listeners.

## Installation

To install `toolbar` search for _toolbar_ in the Install pane of the Lumine settings or run `lumine --install lumine-code/toolbar`.

## Commands

Commands available in `lumine-workspace`:

- `toolbar:toggle`: show or hide the toolbar,
- `toolbar:position-left`: dock at the left edge,
- `toolbar:position-right`: dock at the right edge,
- `toolbar:position-top`: dock at the top edge,
- `toolbar:position-bottom`: dock at the bottom edge.

## Customization

Adjust the toolbar surface in your `styles.css`:

```css
.toolbar {
  gap: 4px;
  background: var(--tool-panel-background-color);
  border-color: var(--base-border-color);
}
```

## Services

- **[toolbar](docs/toolbar.md)** (`1.0.0`): provided to create and manage grouped controls at the workspace edge.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
