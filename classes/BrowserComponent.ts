// @ts-nocheck
import type { OgoneBrowser } from "../types/ogone.ts";
import type { BCE } from "../types/component.ts";
declare const Ogone: OgoneBrowser;
declare type TextElements =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;
const getClassComponent = (
  klass: typeof HTMLElement | typeof HTMLTemplateElement,
) =>
  class extends (Ogone.classes.extends(klass)) {
    declare public type: string;
    constructor() {
      super();
      this.type = "component";
      if (!Ogone.root) {
        let opts = {
          props: null,
          parentCTXId: '',
          dependencies: null,
          requirements: null,
          routes: null,
          isRoot: true,
          isTemplate: true,
          isAsync: false,
          isAsyncNode: false,
          isRouter: false,
          isStore: false,
          isImported: false,
          isRemote: false,
          index: 0,
          level: 0,
          position: [0],
          flags: null,
          originalNode: true,
          uuid: '{% root.uuid %}',
          extends: '-nt',
        };
        Ogone.setOgone(this, opts);
        opts = null;
        Ogone.root = true;
      }
    }
    connectedCallback(this: BCE & this) {
      const o = this.ogone;
      // set position of the template/component
      Ogone.setPosition(this);

      // set the context of the node
      Ogone.setContext(this);
      // Ogone.setHMRContext();

      // parse the route that match with location.pathname
      if (o.type === "router") {
        Ogone.setActualRouterTemplate(this);
      }

      // set the props required by the node
      if (o.isTemplate && o.component) {
        Ogone.setProps(this);
        o.component.updateProps();
      }
      Ogone.renderingProcess(this);

      // now ... just render ftw!
      switch (true) {
        case o.type === "router":
          Ogone.renderRouter(this);
          break;
        case o.type === "store":
          Ogone.renderStore(this);
          break;
        case o.type === "async":
          Ogone.renderAsync(this);
          break;
        default:
          Ogone.renderNode(this);
          break;
      }
    }
  };
export default getClassComponent.toString();
