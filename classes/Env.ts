import { BoilerPlate } from './../enums/templateComponent.ts';
import { browserBuild, template } from "./../src/browser/readfiles.ts";
// TODO fix HMR
// use std websocket instead of deno.x one
// import { HCR } from "../../lib/hmr/index.ts";
import type { Bundle, Environment } from "./../.d.ts";
import { existsSync } from "../utils/exists.ts";
import { join } from "../deps.ts";
import Constructor from "./Constructor.ts";
import { Configuration } from "./Configuration.ts";
import WebComponentExtends from "./WebComponentExtends.ts";
import TSXContextCreator from "./TSXContextCreator.ts";
import Workers from "../enums/workers.ts";
import { DenoStdInternalError } from "https://deno.land/std@0.61.0/_util/assert.ts";
import MapFile from "./MapFile.ts";
export default class Env extends Constructor {
  protected bundle: Bundle | null = null;
  public env: Environment = "development";
  public devtool?: boolean;
  public static _devtool?: boolean;
  public static _env: Environment = "development";
  public WebComponentExtends: WebComponentExtends = new WebComponentExtends();
  protected TSXContextCreator: TSXContextCreator = new TSXContextCreator();

  // workers
  protected serviceDev = new Worker(new URL("../workers/server-dev.ts", import.meta.url).href, {
    type: "module",
    deno: true,
  });
  protected lspWebsocketClientWorker = new Worker(new URL("../workers/lsp-websocket-client.ts", import.meta.url).href, {
    type: "module",
    deno: true,
  });
  constructor() {
    super();
    this.devtool = Configuration.devtool;
    Env._devtool = Configuration.devtool;
  }
  /**
   * set the current bundle for the environment
   * @param {Bundle} bundle
   */
  public setBundle(bundle: Bundle): void {
    this.bundle = bundle;
  }
  /**
   * if the dev would like to use devtool or not
   * @param {boolean} hasdevtool
   */
  public setDevTool(hasdevtool: boolean): void {
    this.devtool = hasdevtool && this.env !== "production";
  }
  /**
 * set the current environment
 * ```ts
 *  this.setEnv("development" | "staging" | "production");
 * ```
 * @param env
 */
  public setEnv(env: Environment): void {
    this.env = env;
    Env._env = env;
  }

  /**
   * Compile your application by giving the path to the root component.
   * @param entrypoint path to root component
   * @param shouldBundle set the bundle of the component after compilation
   */
  public async compile(
    entrypoint: string,
    shouldBundle?: boolean,
  ): Promise<Bundle> {
    const bundle: Bundle = await this.getBundle(entrypoint);
    if (shouldBundle) {
      this.setBundle(bundle);
      return bundle;
    }
    return bundle;
  }
  /**
   * @name listenLSPWebsocket
   * takes no argument, this method add an event listener on the LSP websocket worker
   * connected to the IDE
   * it sends two messages
   */
  public listenLSPWebsocket(): void {
    let timeoutBeforeSendingRequests: number;
    this.lspWebsocketClientWorker.addEventListener('message', (event) => {
      if (timeoutBeforeSendingRequests !== undefined) {
        clearTimeout(timeoutBeforeSendingRequests);
      }
      // this timeout fixes all the broken pipe issue
      timeoutBeforeSendingRequests = setTimeout(() => {
        const { data } = event;
        switch (data.type) {
          case Workers.LSP_UPDATE_CURRENT_COMPONENT:
            const filePath = data.data.path;
            const file = this.template(BoilerPlate.ROOT_COMPONENT_PREVENT_COMPONENT_TYPE_ERROR, {
              filePath: filePath.replace(Deno.cwd(), '@'),
            });
            // save the content of the file to overwrite
            // this allows the live edition
            MapFile.files.set(filePath, {
              content: data.data.text,
              original: Deno.readTextFileSync(data.data.path),
              path: data.data.path,
            });
            const tmpFile = Deno.makeTempFileSync({ prefix: 'ogone_boilerplate_webview', suffix: '.o3' });
            Deno.writeTextFileSync(tmpFile, file);
            this.compile(tmpFile)
              .then((bundle) => {
                const application = this.renderBundle(tmpFile,
                  bundle
                );
                this.serviceDev.postMessage({
                  type: Workers.LSP_UPDATE_SERVER_COMPONENT,
                  application,
                })
                this.lspWebsocketClientWorker.postMessage({
                  type: Workers.LSP_CURRENT_COMPONENT_RENDERED,
                  application,
                })
              })
              .then(() => {
                Deno.remove(tmpFile);
              })
              .catch(() => {
                Deno.remove(tmpFile);
              })
            break;
        }
      }, 250);
    });
  }
  public renderBundle(entrypoint: string, bundle: Bundle): string {
    const stylesDev = Array.from(bundle.components.entries())
      .map((
        entry: any,
      ) => {
        let result = "";
        if (entry[1].style.join("\n").trim().length) {
          result = `<style id="${entry[1].uuid}">${entry[1].style.join("\n")}</style>`;
        }
        return result;
      }).join("\n");
    const esm = Array.from(bundle.components.entries()).map((
      entry: any,
    ) => entry[1].dynamicImportsExpressions).join("\n");
    const style = stylesDev;
    const rootComponent = bundle.components.get(entrypoint);
    if (rootComponent) {
      if (
        rootComponent &&
        ["router", "store", "async"].includes(rootComponent.type)
      ) {
        this.error(
          `the component provided in the entrypoint option has type: ${rootComponent.type}, entrypoint option only supports basic component`,
        );
      }
      const scriptDev = this.template(
        `
        const ___perfData = window.performance.timing;

        ${browserBuild(this.env === "production", {
          hasDevtool: this.devtool,
        })
        }
        ${bundle.datas.join("\n")}
        ${bundle.contexts.slice().reverse().join("\n")}
        ${bundle.render.join("\n")}
        {% extension %}
        ${bundle.customElements.join("\n")}
        {% promise %}
        `,
        {
          extension: this.WebComponentExtends.getExtensions(bundle, entrypoint),
          promise: esm.trim().length
            ? `
            Promise.all([
              ${esm}
            ]).then(() => {
              {% start %}
              {% debugg %}
            });
          `
            : "{%start%}",
          start: `document.body.append(
            document.createElement("template", {
              is: "${rootComponent.uuid}-nt",
            })
          );`,
          render: {},
          root: bundle.components.get(entrypoint),
          destroy: {},
          nodes: {},
          debugg: `
          // debug tools
          const ___connectTime = ___perfData.responseEnd - ___perfData.requestStart;
          const ___renderTime = ___perfData.domLoading - ___perfData.domComplete;
          const ___pageLoadTime = ___perfData.navigationStart - ___perfData.loadEventEnd;
          console.log('[Ogone] server response', ___connectTime, 'ms');
          console.log('[Ogone] app render time', ___renderTime, 'ms');
          console.log('[Ogone] page load time', ___pageLoadTime, 'ms');`,
        },
      );
      // in production DOM has to be
      // <template is="${rootComponent.uuid}-nt"></template>
      const DOMDev = ` `;
      let script = `
      <script type="module">
        ${scriptDev.trim()}
      </script>`;
      let head = `
          ${style}
          ${Configuration.head || ""}`;
      let body = this.template(template, {
        head,
        script,
        dom: DOMDev,
      });

      // start watching components
      // TODO fix HMR
      // use websocket
      // HCR(this.bundle);
      return body;
    } else {
      return "no root-component found";
    }
  }
  public get application(): string {
    if (!this.bundle) {
      throw this.error(
        "undefined bundle, please use setBundle method before accessing to the application",
      );
    }
    return this.renderBundle(Configuration.entrypoint, this.bundle);
  }

  public async resolveAndReadText(path: string) {
    const isFile = path.startsWith("/") ||
      path.startsWith("./") ||
      path.startsWith("../") ||
      !path.startsWith("http://") ||
      !path.startsWith("https://");
    const isTsFile = isFile && path.endsWith(".ts");
    if (Deno.build.os !== "windows") {
      Deno.chmodSync(path, 0o777);
    }
    const text = Deno.readTextFileSync(path);
    return isTsFile
      ? // @ts-ignore
      (await Deno.transpileOnly({
        [path]: text,
      }, {
        sourceMap: false,
      }))[path].source
      : text;
  }
  private recursiveRead(
    opts: { entrypoint: string; onContent: Function },
  ): void {
    if (!existsSync(opts.entrypoint)) {
      this.error("can't find entrypoint for this.recursiveRead");
    }
    if (Deno.build.os !== "windows") {
      Deno.chmodSync(opts.entrypoint, 0o777);
    }
    const stats = Deno.statSync(opts.entrypoint);
    if (stats.isFile) {
      if (Deno.build.os !== "windows") {
        Deno.chmodSync(opts.entrypoint, 0o777);
      }
      const content = Deno.readTextFileSync(opts.entrypoint);
      opts.onContent(opts.entrypoint, content);
    } else if (stats.isDirectory) {
      if (Deno.build.os !== "windows") {
        Deno.chmodSync(opts.entrypoint, 0o777);
      }
      const dir = Deno.readDirSync(opts.entrypoint);
      for (let p of dir) {
        const path = join(opts.entrypoint, p.name);
        this.recursiveRead({
          entrypoint: path,
          onContent: opts.onContent,
        });
      }
    }
  }
  /**
   * get the output of the application
   * including HTML CSS and JS
   */
  public async getBuild() {
    // TODO use worker instead
    this.error(`\nbuild is not yet ready.\nwaiting for a fix on the ts compiler\nplease check this issue: https://github.com/denoland/deno/issues/7054`);
    let Style = '';
    if (!this.bundle) return;
    if (Configuration && Configuration.compileCSS) {
      this.recursiveRead({
        entrypoint: Configuration.entrypoint,
        onContent: (file: string, content: string) => {
          if (file.endsWith('.css')) {
            this.warn(`loading css: ${file}`);
            Style += content;
          }
        }
      });
    }
    const stylesProd = Array.from(this.bundle.components.entries()).map((
      entry: any,
    ) => entry[1].style.join("\n")).join("\n");
    const compiledStyle = Configuration.minifyCSS ? Style + stylesProd.replace(/(\n|\s+|\t)/gi, ' ') : Style + stylesProd;
    const style = `<style>${(compiledStyle)}</style>`;
    const esmProd = Array.from(this.bundle.components.entries()).map((
      entry: any,
    ) => entry[1].dynamicImportsExpressionsProd).join("\n");
    const rootComponent = this.bundle.components.get(Configuration.entrypoint);
    if (rootComponent) {
      if (
        rootComponent &&
        ["router", "store", "async"].includes(rootComponent.type)
      ) {
        this.error(
          `the component provided in the entrypoint option has type: ${rootComponent.type}, entrypoint option only supports normal component`,
        );
      }
      // @ts-ignore
      const [, scriptProd] = await Deno.compile("index.ts", {
        "index.ts": `
        import test from "./test.js"
import Workers from '../enums/workers';
import { BoilerPlate } from '../enums/templateComponent';
import MapFile from './MapFile';
        `,
        "test.js": "export default 10;",
      }, {
        module: "esnext",
        target: "esnext",
        experimentalDecorators: true,
        allowUnreachableCode: false,
        jsx: "preserve",
        jsxFactory: "Ogone.r(",
        inlineSourceMap: false,
        inlineSources: false,
        alwaysStrict: false,
        sourceMap: false,
        strictFunctionTypes: true,
        lib: ["esnext"],
      });
      // in production DOM has to be
      // <template is="${rootComponent.uuid}-nt"></template>
      const DOMProd = `<template is="${rootComponent.uuid}-nt"></template>`;
      let head = `
          ${style}
          ${Configuration.head || ""}
          <script>
            ${scriptProd["index.js"].trim()}
          </script>`;
      let body = template
        .replace(/%%head%%/, head)
        .replace(/%%dom%%/, DOMProd);
      return body;
    } else {
      this.error("no root-component found");
    }
  }
}
