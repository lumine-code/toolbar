describe("toolbar", () => {
  let main;
  let workspaceElement;

  beforeEach(async () => {
    lumine.config.set("toolbar.visible", true);
    lumine.config.set("toolbar.position", "Left");
    lumine.config.set("toolbar.iconSize", "24px");
    lumine.config.set("toolbar.fullWidth", true);
    const pack = await lumine.packages.activatePackage("toolbar");
    main = pack.mainModule;
    workspaceElement = lumine.views.getView(lumine.workspace);
    jasmine.attachToDOM(workspaceElement);
  });

  afterEach(async () => {
    await lumine.packages.deactivatePackage("toolbar");
  });

  it("docks at the left edge by default", () => {
    main
      .provideToolbar()("spec")
      .addButton({ text: "Action", callback() {} });
    expect(main.view.panel.getItem()).toBe(main.view.element);
    expect(main.view.element.classList.contains("toolbar-vertical")).toBe(true);
  });

  it("reports menu position choices when settings change outside the menu", () => {
    const state = (command) =>
      lumine.commands.getCommandState(command, { target: workspaceElement });
    expect(state("toolbar:toggle")).toBeNull();
    expect(state("toolbar:position-left")).toEqual({ type: "radio", checked: true });
    lumine.config.set("toolbar.position", "Right");
    expect(state("toolbar:position-left").checked).toBe(false);
    expect(state("toolbar:position-right").checked).toBe(true);
  });

  it("accepts a native control constructed in an auxiliary document", async () => {
    const extra = await lumine.workspace.openEditorWindow({ show: false });
    try {
      const element = extra.getDocument().createElement("span");
      element.textContent = "Auxiliary control";
      const item = main.provideToolbar()("spec").addItem({ element });
      expect(item.element).toBe(element);
      expect(main.view.element.contains(element)).toBeTrue();
      expect(element.ownerDocument).toBe(document);
    } finally {
      await lumine.workspace.discardEditorWindows();
    }
  });

  it("reserves no workspace space without controls, including spacer-only groups", () => {
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
    main.provideToolbar()("spec").addSpacer();
    lumine.commands.dispatch(workspaceElement, "toolbar:position-bottom");
    expect(main.view.panel).toBeNull();
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
    expect(lumine.config.get("toolbar.visible")).toBe(true);
  });

  it("undocks after the last control is removed and returns when a control is added", () => {
    const group = main.provideToolbar()("spec");
    group.addSpacer();
    const button = group.addButton({ text: "Action", callback() {} });
    expect(workspaceElement.querySelector(".toolbar")).toBe(main.view.element);
    button.destroy();
    expect(main.view.panel).toBeNull();
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
    group.addButton({ text: "Another", callback() {} });
    expect(workspaceElement.querySelector(".toolbar")).toBe(main.view.element);
  });

  it("does not reveal new controls when the toolbar is disabled in settings", () => {
    lumine.config.set("toolbar.visible", false);
    main
      .provideToolbar()("spec")
      .addButton({ text: "Action", callback() {} });
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
    lumine.config.set("toolbar.visible", true);
    expect(workspaceElement.querySelector(".toolbar")).toBe(main.view.element);
  });

  it("closes the center editor from a toolbar control while retaining the toolbar", async () => {
    const editor = await lumine.workspace.open();
    main.view.show();
    const button = main
      .provideToolbar()("spec")
      .addButton({ text: "Action", callback() {} });

    await lumine.commands.dispatch(button.element, "core:close");

    expect(workspaceElement.querySelector(".toolbar")).toBe(main.view.element);
    expect(editor.isDestroyed()).toBe(true);
  });

  it("adds grouped controls in priority order", () => {
    const getToolbar = main.provideToolbar();
    const group = getToolbar("spec");
    const later = group.addButton({ text: "Later", callback() {}, priority: 20 });
    const first = group.addButton({ text: "First", callback() {}, priority: 10 });
    const spacer = group.addSpacer({ priority: 15 });

    expect(main.view.items).toEqual([first, spacer, later]);
    expect(main.view.element.textContent).toBe("FirstLater");
  });

  it("loads bundled icon styles only when their iconset is used", async () => {
    const selector = 'link[href="lumine://toolbar/iconsets/mdi/materialdesignicons.css"]';
    expect(document.head.querySelector(selector)).toBeNull();

    main
      .provideToolbar()("spec")
      .addButton({ icon: "settings", iconset: "mdi", callback() {} });

    expect(document.head.querySelector(selector)).not.toBeNull();
    await lumine.packages.deactivatePackage("toolbar");
    expect(document.head.querySelector(selector)).toBeNull();
  });

  it("dispatches command callbacks without stealing editor focus", async () => {
    const editor = await lumine.workspace.open();
    const editorElement = lumine.views.getView(editor);
    editorElement.focus();
    const command = jasmine.createSpy("command");
    const disposable = lumine.commands.add(editorElement, "spec:toolbar-command", command);
    const button = main.provideToolbar()("spec").addButton({
      icon: "gear",
      callback: "spec:toolbar-command",
    });

    button.element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    button.element.click();

    expect(command).toHaveBeenCalled();
    expect(editorElement.contains(document.activeElement)).toBe(true);
    disposable.dispose();
    editor.destroy();
  });

  it("tracks selected and enabled button state", () => {
    const button = main
      .provideToolbar()("spec")
      .addButton({ callback() {} });
    const callback = jasmine.createSpy("callback");
    button.options.callback = callback;

    button.setSelected(true);
    expect(button.getSelected()).toBe(true);
    button.setEnabled(false);
    button.element.click();
    expect(callback).not.toHaveBeenCalled();
  });

  it("removes only controls owned by a group", () => {
    const getToolbar = main.provideToolbar();
    const first = getToolbar("first");
    const second = getToolbar("second");
    first.addButton({ text: "First", callback() {} });
    second.addButton({ text: "Second", callback() {} });

    first.removeItems();

    expect(main.view.items.length).toBe(1);
    expect(main.view.items[0].group).toBe("second");
  });

  it("moves between workspace edges through commands", () => {
    main
      .provideToolbar()("spec")
      .addButton({ text: "Action", callback() {} });
    lumine.commands.dispatch(workspaceElement, "toolbar:position-bottom");
    const footer = lumine.views.getView(lumine.workspace.panelContainers.footer);

    expect(footer.querySelector(".toolbar")).toBe(main.view.element);
    expect(main.view.element.classList.contains("toolbar-horizontal")).toBe(true);
  });

  it("toggles visibility and removes its panel on deactivation", async () => {
    main
      .provideToolbar()("spec")
      .addButton({ text: "Action", callback() {} });
    lumine.commands.dispatch(workspaceElement, "toolbar:toggle");
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
    lumine.commands.dispatch(workspaceElement, "toolbar:toggle");
    expect(workspaceElement.querySelector(".toolbar")).toBe(main.view.element);

    await lumine.packages.deactivatePackage("toolbar");
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
  });
});
