describe("toolbar returned item ownership", () => {
  let main, firstGroup, secondGroup;

  function item(group, name, priority) {
    const element = document.createElement("button");
    element.dataset.item = name;
    return group.addItem({ element, priority });
  }

  beforeEach(async () => {
    jasmine.attachToDOM(lumine.views.getView(lumine.workspace));
    main = (await lumine.packages.activatePackage("toolbar")).mainModule;
    const getToolbar = main.provideToolbar();
    firstGroup = getToolbar("first");
    secondGroup = getToolbar("second");
  });

  afterEach(async () => {
    if (lumine.packages.isPackageActive("toolbar"))
      await lumine.packages.deactivatePackage("toolbar");
  });

  it("removes the exact destroyed record before inserting another priority", () => {
    const first = item(firstGroup, "first", 1);
    const removed = item(firstGroup, "removed", 2);
    const last = item(secondGroup, "last", 3);
    removed.destroy();
    const middle = item(firstGroup, "middle", 1.5);
    expect(main.view.items).toEqual([first, middle, last]);
    expect(
      [...main.view.element.querySelectorAll("[data-item]")].map((element) => element.dataset.item),
    ).toEqual(["first", "middle", "last"]);
  });

  it("removes individually destroyed spacers and preserves the other group on later cleanup", () => {
    const spacer = firstGroup.addSpacer({ priority: 1 });
    const remaining = item(secondGroup, "remaining", 2);
    spacer.destroy();
    expect(main.view.items).toEqual([remaining]);
    spacer.destroy();
    firstGroup.removeItems();
    expect(main.view.items).toEqual([remaining]);
    expect(remaining.element.isConnected).toBe(true);
  });

  it("refreshes gutter layout after individual removal and does nothing on repeated removal", () => {
    const handle = item(firstGroup, "remove", 1);
    spyOn(main.view, "drawGutter").and.callThrough();
    handle.destroy();
    expect(main.view.drawGutter).toHaveBeenCalledTimes(1);
    handle.destroy();
    expect(main.view.drawGutter).toHaveBeenCalledTimes(1);
  });

  it("releases a button's tooltip and listeners once without removing a shared iconset", () => {
    const addTooltip = lumine.tooltips.add.bind(lumine.tooltips);
    let tooltip;
    spyOn(lumine.tooltips, "add").and.callFake((...args) => {
      tooltip = addTooltip(...args);
      spyOn(tooltip, "dispose").and.callThrough();
      return tooltip;
    });
    const callback = jasmine.createSpy("callback");
    const removed = firstGroup.addButton({
      icon: "settings",
      iconset: "mdi",
      tooltip: "Remove",
      callback,
    });
    const element = removed.element;
    const remaining = secondGroup.addButton({ icon: "settings", iconset: "mdi", callback() {} });
    const stylesheet = document.head.querySelector(
      'link[href="lumine://toolbar/iconsets/mdi/materialdesignicons.css"]',
    );
    removed.destroy();
    removed.destroy();
    element.click();
    expect(callback).not.toHaveBeenCalled();
    expect(tooltip.dispose).toHaveBeenCalledTimes(1);
    expect(stylesheet.isConnected).toBe(true);
    expect(main.view.items).toEqual([remaining]);
    firstGroup.removeItems();
    expect(remaining.element.isConnected).toBe(true);
  });

  it("destroys every remaining item once on provider teardown without skipping a shrinking collection", async () => {
    const handles = [
      item(firstGroup, "one", 1),
      firstGroup.addSpacer({ priority: 2 }),
      secondGroup.addButton({ callback() {}, priority: 3 }),
    ];
    const elements = handles.map((handle) => handle.element);
    for (const handle of handles) spyOn(handle, "destroy").and.callThrough();
    const view = main.view;
    await lumine.packages.deactivatePackage("toolbar");
    expect(view.items).toEqual([]);
    for (let index = 0; index < handles.length; index++) {
      expect(handles[index].destroy).toHaveBeenCalledTimes(1);
      expect(elements[index].isConnected).toBe(false);
    }
  });

  it("does not let a retired handle remove controls belonging to the next package generation", async () => {
    const old = item(firstGroup, "old", 1);
    await lumine.packages.deactivatePackage("toolbar");
    main = (await lumine.packages.activatePackage("toolbar")).mainModule;
    const group = main.provideToolbar()("first");
    const current = item(group, "current", 1);
    old.destroy();
    firstGroup.removeItems();
    expect(main.view.items).toEqual([current]);
    expect(current.element.isConnected).toBe(true);
  });
});
