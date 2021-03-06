//@ts-nocheck
import { OgoneBrowser } from "../../types/ogone.ts";

let Ogone: OgoneBrowser;
function _OGONE_BROWSER_CONTEXT() {
  Ogone.hmr = async function (url) {
    try {
      const mod = await import(`${url}?p=\${performance.now()}`);
      const keys = Object.keys(Ogone.mod);
      keys.filter((key) => key === url).forEach((key) => {
        Ogone.mod[key] = mod;
      });
      Ogone.mod["*"]
        .forEach(([key, f], i, arr) => {
          key === url && f && !f(mod) ? delete arr[i] : 0;
        });
      return mod;
    } catch (err) {
      Ogone.error(err.message, "HMR-Error", {
        message: `
        module's url: ${url}
        `,
      });
      throw err;
    }
  };
  Ogone.hmrTemplate = async function (uuid, pragma) {
    try {
      const templates = Ogone.mod[uuid];
      if (templates) {
        templates.forEach((f, i, arr) => {
          f && !f(pragma) ? delete arr[i] : 0;
        });
      }
      return templates;
    } catch (err) {
      Ogone.error(err.message, "HMR-Error", err);
      throw err;
    }
  };
  Ogone.hmrRuntime = async function (uuid, runtime) {
    try {
      const components = Ogone.run[uuid];
      if (components) {
        components.forEach((c, i, arr) => {
          if (c.activated) {
            c.runtime = runtime.bind(c.data);
            c.runtime(0);
            c.renderTexts(true);
          } else {
            delete arr[i];
          }
        });
      }
      return components;
    } catch (err) {
      Ogone.error(err.message, "HMR-Error", err);
      throw err;
    }
  };
  // @ts-ignore
  const ws = new WebSocket(`ws://localhost:5392/`);

  ws.onmessage = (msg) => {
    const { url, type, uuid, pragma, ctx, style, runtime } = JSON.parse(
      msg.data,
    );
    if (type === "javascript") {
      Ogone.hmr(url).then(() => {
        console.warn("[Ogone] hmr:", url);
        Ogone.infos({
          message: `[HMR] module updated: ${url}`,
        });
      });
    }
    if (type === "template" && pragma && uuid) {
      eval(ctx);
      Ogone.hmrTemplate(uuid, pragma).then(() => {
        Ogone.infos({
          message: `[HMR] template updated: ${uuid}`,
        });
      });
    }
    if (type === "reload") {
      console.warn("[Ogone] hmr: reloading the application");
      Ogone.infos({
        message: `[HMR] socket lost. Reloading your application`,
      });
      setTimeout(() => {
        location.reload();
      }, 1000);
    }
    if (type === "style") {
      document.querySelector(`style[id="${uuid}"]`).innerHTML = style;
      Ogone.infos({
        message: `[HMR] style updated: ${uuid}`,
      });
    }
    if (type === "runtime") {
      const r = eval(runtime);
      Ogone.hmrRuntime(uuid, (r || function () { })).then(() => {
        Ogone.infos({
          message: `[HMR] component updated: ${uuid}`,
        });
      });
    }
  };

  ws.onclose = () => {
    setTimeout(() => {
      console.warn("[Ogone] ws closed: reloading");
      location.reload();
    }, 1000);
  };
  Ogone.showPanel = (panelName, time) => {
    const panel = Ogone[panelName + "Panel"];
    if (panel) {
      document.body.append(panel);
      if (time) {
        setTimeout(() => {
          const f = document.createDocumentFragment();
          f.append(panel);
        }, time);
      }
    }
  };
  Ogone.infos = (opts) => {
    if (!Ogone.infosPanel) {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.opacity = "0.85";
      container.style.bottom = "0px";
      container.style.left = "0px";
      container.style.background = "var(--o-header, #333333)";
      container.style.padding = "5px";
      container.style.paddingRight = "15px";
      container.style.width = "max-content";
      container.style.color = "var(--o-grey, #cecece)";
      container.style.fontSize = "10pt";
      container.style.fontFamily = "sans-serif";
      container.style.borderLeft = "3px solid var(--o-secondary, #61c3aa)";
      container.style.zIndex = "400000";
      const p = document.createElement("p");
      Ogone.infosPanel = container;
      Ogone.infosPanel.p = p;
    }
    const { p } = Ogone.infosPanel;
    p.innerHTML = opts.message;
    Ogone.infosPanel.innerHTML = p.outerHTML;
    Ogone.showPanel("infos", 2000);
  };
}
export default _OGONE_BROWSER_CONTEXT.toString()
  .replace(/_this/gi, "this")
  .replace("function _OGONE_BROWSER_CONTEXT() {", "")
  .slice(0, -1);
