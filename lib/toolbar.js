const { CompositeDisposable, Emitter } = require("lumine");

const ICON_SIZES = ["12px", "14px", "16px", "18px", "21px", "24px", "28px", "32px"];
const POSITIONS = ["Top", "Right", "Bottom", "Left"];

function rafDebounce(callback) {
  let requestId = null;
  const debounced = () => {
    if (requestId !== null) cancelAnimationFrame(requestId);
    requestId = requestAnimationFrame(() => {
      requestId = null;
      callback();
    });
  };
  debounced.dispose = () => {
    if (requestId !== null) cancelAnimationFrame(requestId);
    requestId = null;
  };
  return debounced;
}

class ToolbarItem {
  constructor(options, group) {
    if (!(options?.element instanceof HTMLElement)) {
      throw new TypeError("Toolbar items require an HTMLElement");
    }
    this.element = options.element;
    this.priority = options.priority;
    this.group = group;
  }

  destroy() {
    this.element?.remove();
    this.element = null;
  }
}

class ToolbarButton extends ToolbarItem {
  constructor(options, group) {
    if (!options || options.callback == null) {
      throw new TypeError("Toolbar buttons require a callback");
    }
    super({ element: document.createElement("button"), priority: options.priority }, group);
    this.options = options;
    this.enabled = true;
    this.subscriptions = new CompositeDisposable();
    this.classNames = ["btn", "btn-default", "toolbar-button"];
    if (this.priority < 0) this.classNames.push("toolbar-item-align-end");
    this.addIcon();
    this.addText();
    this.addTooltip();
    this.setStyle("color", options.color);
    this.setStyle("background", options.background);
    this.addClasses();
    this.onMouseDown = (event) => event.preventDefault();
    this.onClick = (event) => this.handleClick(event);
    this.element.addEventListener("mousedown", this.onMouseDown);
    this.element.addEventListener("click", this.onClick);
  }

  addIcon() {
    const { icon, iconset } = this.options;
    if (!icon) return;
    if (!iconset) this.classNames.push(`icon-${icon}`);
    else if (iconset.startsWith("fa")) this.classNames.push(iconset, `fa-${icon}`);
    else this.classNames.push(iconset, `${iconset}-${icon}`);
  }

  addText() {
    if (!this.options.text) return;
    if (this.options.html) this.element.innerHTML = this.options.text;
    else this.element.textContent = this.options.text;
  }

  addTooltip() {
    if (!this.options.tooltip) return;
    const tooltip =
      typeof this.options.tooltip === "string"
        ? { title: this.options.tooltip }
        : { ...this.options.tooltip };
    if (!Object.hasOwn(tooltip, "placement")) tooltip.placement = tooltipPlacement();
    if (!Object.hasOwn(tooltip, "keyBindingCommand") && typeof this.options.callback === "string") {
      tooltip.keyBindingCommand = this.options.callback;
    }
    this.subscriptions.add(lumine.tooltips.add(this.element, tooltip));
  }

  setStyle(property, value) {
    if (value) this.element.style[property] = value;
  }

  addClasses() {
    if (Array.isArray(this.options.class)) this.classNames.push(...this.options.class);
    else if (this.options.class) this.classNames.push(this.options.class);
    this.element.classList.add(...this.classNames);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.element.disabled = !this.enabled;
    this.element.classList.toggle("disabled", !this.enabled);
  }

  setSelected(selected) {
    this.element.classList.toggle("selected", Boolean(selected));
  }

  getSelected() {
    return this.element.classList.contains("selected");
  }

  handleClick(event) {
    if (this.enabled) this.executeCallback(event);
    event.preventDefault();
    event.stopPropagation();
  }

  executeCallback(event) {
    let callback = this.options.callback;
    if (callback && typeof callback === "object" && !Array.isArray(callback)) {
      callback = callbackForModifiers(callback, event);
    }
    const callbacks = Array.isArray(callback) ? callback : [callback];
    const workspaceElement = lumine.views.getView(lumine.workspace);
    const target = workspaceElement.contains(document.activeElement)
      ? document.activeElement
      : workspaceElement;

    for (const action of callbacks) {
      if (typeof action === "string") lumine.commands.dispatch(target, action);
      else if (typeof action === "function") action.call(this, this.options.data, target);
    }
  }

  destroy() {
    if (!this.element) return;
    this.subscriptions.dispose();
    this.element.removeEventListener("mousedown", this.onMouseDown);
    this.element.removeEventListener("click", this.onClick);
    super.destroy();
  }
}

class ToolbarSpacer extends ToolbarItem {
  constructor(options = {}, group) {
    super({ element: document.createElement("hr"), priority: options.priority }, group);
    this.element.classList.add("toolbar-spacer");
    if (this.priority < 0) this.element.classList.add("toolbar-item-align-end");
  }
}

class ToolbarManager {
  constructor(group, view) {
    if (typeof group !== "string" || group.length === 0) {
      throw new TypeError("Toolbar groups require a non-empty name");
    }
    this.group = group;
    this.view = view;
  }

  addItem(options) {
    return this.view.addItem(new ToolbarItem(options, this.group));
  }

  addButton(options) {
    return this.view.addItem(new ToolbarButton(options, this.group));
  }

  addSpacer(options) {
    return this.view.addItem(new ToolbarSpacer(options, this.group));
  }

  removeItems() {
    for (const item of this.view.items.filter((candidate) => candidate.group === this.group)) {
      this.view.removeItem(item);
    }
  }

  onDidDestroy(callback) {
    return this.view.emitter.on("did-destroy", callback);
  }
}

class ToolbarView {
  constructor() {
    this.element = document.createElement("div");
    this.element.className = "toolbar native-key-bindings";
    this.element.tabIndex = -1;
    this.items = [];
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();
    this.drawGutter = rafDebounce(() => this.updateGutter());
    this.subscriptions.add(this.drawGutter);
    this.element.addEventListener("scroll", this.drawGutter);
    window.addEventListener("resize", this.drawGutter);

    this.subscriptions.add(
      lumine.commands.add("lumine-workspace", {
        "toolbar:toggle": () => this.toggle(),
        "toolbar:position-top": () => this.setPosition("Top"),
        "toolbar:position-right": () => this.setPosition("Right"),
        "toolbar:position-bottom": () => this.setPosition("Bottom"),
        "toolbar:position-left": () => this.setPosition("Left"),
      }),
      lumine.config.observe("toolbar.iconSize", (value) => this.updateSize(value)),
      lumine.config.onDidChange("toolbar.position", () => this.refresh()),
      lumine.config.onDidChange("toolbar.fullWidth", () => this.refresh()),
      lumine.config.onDidChange("toolbar.useGutter", () => this.updateGutter()),
      lumine.config.onDidChange("toolbar.visible", ({ newValue }) =>
        newValue ? this.show() : this.hide(),
      ),
    );

    if (lumine.config.get("toolbar.visible")) this.show();
  }

  addItem(item) {
    item.priority = this.calculatePriority(item);
    item.element.dataset.group = item.group;
    item.element.dataset.priority = String(item.priority);
    let index = this.items.findIndex((candidate) => candidate.priority > item.priority);
    if (index === -1) index = this.items.length;
    const nextItem = this.items[index];
    this.items.splice(index, 0, item);
    this.element.insertBefore(item.element, nextItem?.element ?? null);
    this.drawGutter();
    return item;
  }

  removeItem(item) {
    const index = this.items.indexOf(item);
    if (index === -1) return false;
    this.items.splice(index, 1);
    item.destroy();
    this.drawGutter();
    return true;
  }

  calculatePriority(item) {
    if (Number.isFinite(Number(item.priority))) return Number(item.priority);
    const previousGroup = this.items.filter((candidate) => candidate.group !== item.group).at(-1);
    return previousGroup ? previousGroup.priority + 1 : 50;
  }

  updateSize(size) {
    for (const value of ICON_SIZES) this.element.classList.remove(`toolbar-${value}`);
    this.element.classList.add(`toolbar-${ICON_SIZES.includes(size) ? size : "24px"}`);
  }

  setPosition(position) {
    if (!POSITIONS.includes(position))
      throw new RangeError(`Unsupported toolbar position: ${position}`);
    lumine.config.set("toolbar.position", position);
    this.refresh();
  }

  createPanel(position) {
    const options = { item: this.element, priority: 50 };
    const fullWidth = lumine.config.get("toolbar.fullWidth");
    if (position === "Top") {
      return fullWidth
        ? lumine.workspace.addHeaderPanel(options)
        : lumine.workspace.addTopPanel(options);
    }
    if (position === "Right") return lumine.workspace.addRightPanel(options);
    if (position === "Bottom") {
      return fullWidth
        ? lumine.workspace.addFooterPanel(options)
        : lumine.workspace.addBottomPanel(options);
    }
    return lumine.workspace.addLeftPanel(options);
  }

  show() {
    this.hide();
    const position = POSITIONS.includes(lumine.config.get("toolbar.position"))
      ? lumine.config.get("toolbar.position")
      : "Left";
    this.element.classList.remove(
      "toolbar-top",
      "toolbar-right",
      "toolbar-bottom",
      "toolbar-left",
      "toolbar-horizontal",
      "toolbar-vertical",
    );
    this.element.classList.add(`toolbar-${position.toLowerCase()}`);
    this.element.classList.add(
      position === "Top" || position === "Bottom" ? "toolbar-horizontal" : "toolbar-vertical",
    );
    this.panel = this.createPanel(position);
    this.updateSize(lumine.config.get("toolbar.iconSize"));
    this.drawGutter();
  }

  hide() {
    this.panel?.destroy();
    this.panel = null;
    this.element.remove();
  }

  refresh() {
    if (lumine.config.get("toolbar.visible")) this.show();
  }

  toggle() {
    lumine.config.set("toolbar.visible", !lumine.config.get("toolbar.visible"));
  }

  updateGutter() {
    this.element.classList.remove("gutter-start", "gutter-end");
    if (!lumine.config.get("toolbar.useGutter")) return;
    const vertical = this.element.classList.contains("toolbar-vertical");
    const offset = vertical ? this.element.scrollTop : this.element.scrollLeft;
    const visible = vertical ? this.element.clientHeight : this.element.clientWidth;
    const total = vertical ? this.element.scrollHeight : this.element.scrollWidth;
    if (offset > 0) this.element.classList.add("gutter-start");
    if (offset + visible < total) this.element.classList.add("gutter-end");
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const item of this.items) item.destroy();
    this.items = [];
    this.subscriptions.dispose();
    this.element.removeEventListener("scroll", this.drawGutter);
    window.removeEventListener("resize", this.drawGutter);
    this.hide();
    this.emitter.emit("did-destroy");
    this.emitter.dispose();
  }
}

function callbackForModifiers(callbacks, { altKey, ctrlKey, shiftKey }) {
  const active = new Set([
    ...(altKey ? ["alt"] : []),
    ...(ctrlKey ? ["ctrl"] : []),
    ...(shiftKey ? ["shift"] : []),
  ]);
  for (const [combination, callback] of Object.entries(callbacks)) {
    if (!combination && active.size === 0) return callback;
    const expected = new Set(
      combination
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter(Boolean),
    );
    if (expected.size === active.size && [...expected].every((key) => active.has(key)))
      return callback;
  }
  return callbacks[""];
}

function tooltipPlacement() {
  return { Top: "bottom", Right: "left", Bottom: "top", Left: "right" }[
    lumine.config.get("toolbar.position")
  ];
}

module.exports = {
  view: null,

  activate() {
    this.view = new ToolbarView();
  },

  deactivate() {
    this.view?.destroy();
    this.view = null;
  },

  provideToolbar() {
    return (group) => new ToolbarManager(group, this.view);
  },
};
