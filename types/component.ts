import { Template } from "./template.ts";
export type OnodeComponentRenderOptions = {
  callingNewComponent?: boolean;
  length: number;
};
export interface OnodeComponent {
  key: string | null;
  data: { [s: string]: any } | null;
  type: "store" | "async" | "component" | "router" | "controller";
  dependencies: null | string[];
  state: number;
  activated: boolean;
  namespace: null | string;
  store: any;
  contexts: any;
  promises: Promise<any>[];
  async: {
    then: null | any;
    catch: null | any;
    finally: null | any;
  };
  promiseResolved: boolean;
  texts: (() => any)[];
  childs: OnodeComponent[];
  parent: OnodeComponent | null;
  requirements: any;
  positionInParentComponent: number[];
  props: [string, string, ...any[]][];
  startLifecycle: (params?: any, event?: Event) => any;
  initStore(): any;
  runtime(_state: number | string, ctx?: any, event?: Event): any;
  update(dependency?: string): void;
  updateStore(dependency?: string): void;
  react: Function[];
  updateProps(dependency: string): void;
  resolve: Function | null;
  dispatchAwait: Function | null;
  render(Onode: Template, opts: OnodeComponentRenderOptions): void;
  reactTo(dependency: string): void;
  renderTexts(dependency: string): void;
  parentContext(ctx: any): any;
}
