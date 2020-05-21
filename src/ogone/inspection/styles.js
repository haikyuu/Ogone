import Ogone from "../index.ts";
import scopeCSS from "../../lib/html-this/scopeCSS.js";

export default function oRenderStyles() {
  const entries = Array.from(Ogone.components.entries());
  entries.forEach(([pathToComponent, component], i) => {
    const styles = component.rootNodePure.childNodes.filter((node) =>
      node.tagName === "style"
    );
    styles.forEach((element) => {
      const css = scopeCSS(element.childNodes[0].rawText, component.uuid);
      component.style.push(css);
    });
  });
}