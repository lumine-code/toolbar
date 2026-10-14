// Authentic package usage. Run with lumine/script/demo.js; fixtures stay in demo/.
module.exports = {
  version: 1,
  dependencies: ["language-javascript", "tree-view", "search-panel", "command-palette"],
  viewport: { width: 1200, height: 760 },
  async before() {},
  async prepare(context) {
    const { lumine, state, fixture, open } = context;
    state.editor = await open("Signal Lab/src/signal.js");
    await lumine.project.setPaths([fixture("Signal Lab")]);
  },
  scenes: [
    {
      id: "scene-1",
      file: "demo.png",
      caption:
        "Use a toolbar configured with project navigation, search and command-palette actions.",
      timeout: 60000,
      async run(context) {
        const { lumine, state } = context;
        {
          lumine.commands.dispatch(lumine.views.getView(state.editor), "tree-view:show");
          lumine.config.set("toolbar.visible", true);
          state.toolbar = lumine.packages.getActivePackage("toolbar").mainModule.provideToolbar()(
            "example-workflow",
          );
          state.toolbar.addButton({
            icon: "file-directory",
            tooltip: "Project tree",
            callback: "tree-view:toggle",
          });
          state.toolbar.addButton({
            icon: "search",
            tooltip: "Search",
            callback: "search-panel:show",
          });
          state.toolbar.addButton({
            icon: "list-unordered",
            tooltip: "Command palette",
            callback: "command-palette:toggle",
          });
        }
      },
      ready() {
        return Boolean(document.querySelector("tool-bar, .tool-bar, .toolbar"));
      },
    },
  ],
  async cleanup(context) {
    const { state } = context;
    state.toolbar.removeItems();
  },
};
