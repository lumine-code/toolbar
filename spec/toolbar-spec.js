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
    expect(main.view.panel.getItem()).toBe(main.view.element);
    expect(main.view.element.classList.contains("toolbar-vertical")).toBe(true);
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
    lumine.commands.dispatch(workspaceElement, "toolbar:position-bottom");
    const footer = lumine.views.getView(lumine.workspace.panelContainers.footer);

    expect(footer.querySelector(".toolbar")).toBe(main.view.element);
    expect(main.view.element.classList.contains("toolbar-horizontal")).toBe(true);
  });

  it("toggles visibility and removes its panel on deactivation", async () => {
    lumine.commands.dispatch(workspaceElement, "toolbar:toggle");
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
    lumine.commands.dispatch(workspaceElement, "toolbar:toggle");
    expect(workspaceElement.querySelector(".toolbar")).toBe(main.view.element);

    await lumine.packages.deactivatePackage("toolbar");
    expect(workspaceElement.querySelector(".toolbar")).toBeNull();
  });
});
