const { Disposable } = require("lumine");

describe("toolbar service retirement", () => {
  let main, factory, consumer, workspace;

  beforeEach(async () => {
    workspace = lumine.views.getView(lumine.workspace);
    jasmine.attachToDOM(workspace);
    consumer = lumine.packages.serviceHub.consume("toolbar", "^1.0.0", (value) => {
      factory = value;
      return new Disposable();
    });
    main = (await lumine.packages.activatePackage("toolbar")).mainModule;
  });

  afterEach(async () => {
    consumer.dispose();
    if (lumine.packages.isPackageActive("toolbar"))
      await lumine.packages.deactivatePackage("toolbar");
    main.deactivate();
  });

  it("keeps a retained service factory inert after provider deactivation and reactivation", async () => {
    const retained = factory;
    await lumine.packages.deactivatePackage("toolbar");
    const item = retained("late").addButton({ text: "Late", callback() {}, tooltip: "Late" });
    expect(workspace.querySelectorAll(".toolbar").length).toBe(0);
    expect(item.element).toBeNull();
    main = (await lumine.packages.activatePackage("toolbar")).mainModule;
    const current = main.view;
    retained("late-again").addSpacer();
    expect(workspace.querySelectorAll(".toolbar").length).toBe(1);
    expect(main.view).toBe(current);
    expect(current.items.length).toBe(0);
  });

  it("does not allocate tooltips or icon styles through a retained manager", async () => {
    const manager = factory("retained");
    await lumine.packages.deactivatePackage("toolbar");
    spyOn(lumine.tooltips, "add").and.callThrough();
    const button = manager.addButton({
      icon: "gear",
      iconset: "fa",
      callback() {},
      tooltip: "Late",
    });
    expect(lumine.tooltips.add).not.toHaveBeenCalled();
    expect(document.head.querySelector('link[href*="toolbar/iconsets/"]')).toBeNull();
    expect(button.element).toBeNull();
    button.setEnabled(true);
    button.setSelected(true);
    expect(button.getSelected()).toBe(false);
    button.destroy();
    manager.removeItems();
  });

  it("leaves a borrowed item in its owner DOM when a retired manager is called", async () => {
    const manager = factory("borrowed");
    const item = document.createElement("div");
    workspace.appendChild(item);
    await lumine.packages.deactivatePackage("toolbar");
    const handle = manager.addItem({ element: item });
    expect(item.parentElement).toBe(workspace);
    handle.destroy();
    expect(item.parentElement).toBe(workspace);
    item.remove();
  });

  it("preserves replacement activation resources created during owned cleanup", async () => {
    factory("older").addButton({ icon: "gear", iconset: "fa", callback() {} });
    let replacement;
    // Exercise opaque cleanup reentry through the real owned CompositeDisposable.
    main.subscriptions.add(
      new Disposable(() => {
        main.activate();
        replacement = main
          .provideToolbar()("replacement")
          .addButton({ icon: "settings", iconset: "mdi", callback() {} });
      }),
    );
    await lumine.packages.deactivatePackage("toolbar");
    expect(main.view.element.contains(replacement.element)).toBe(true);
    expect(workspace.querySelectorAll(".toolbar").length).toBe(1);
    expect(
      document.head.querySelector(
        'link[href="lumine://toolbar/iconsets/mdi/materialdesignicons.css"]',
      ),
    ).not.toBeNull();
    expect(
      document.head.querySelector(
        'link[href="lumine://toolbar/iconsets/font-awesome/font-awesome.css"]',
      ),
    ).toBeNull();
  });
});
