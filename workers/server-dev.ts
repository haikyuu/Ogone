import { getHeaderContentTypeOf } from "../utils/extensions-resolution.ts";
import { existsSync } from "./../utils/exists.ts";
// import HMR from "../lib/hmr/index.ts";
import { serve } from "../deps.ts";
import { Utils } from '../classes/Utils.ts';
import Workers from '../enums/workers.ts';

export interface Controller {
  namespace: string;
  protocol: any;
  runtime: any;
  file: string;
}
export type Controllers = {
  [k: string]: Controller;
}
let controllers: Controllers = {};

async function control(req: any): Promise<boolean> {
  const ns = req.url.slice(1).split("/")[0];
  if (req.url.indexOf("/") > -1 && req.url.startsWith(`/${ns}/`)) {
    const controller = controllers[ns] || controllers[`/${ns}`];
    if (controller) {
      const route = req.url.replace(`/${ns}`, "");
      const t = req.method;
      let response = await controller.runtime(`${t}:${route}`, req);
      if (response) {
        switch (true) {
          case typeof response === "object":
            response = JSON.stringify(response);
            break;
        }
        req.respond({
          body: response,
        });
        return true;
      }
    }
  }
  return false;
}
async function resolveAndReadText(path: string) {
  const isFile = path.startsWith("/") ||
    path.startsWith("./") ||
    path.startsWith("../") ||
    !path.startsWith("http://") ||
    !path.startsWith("https://");
  const isTsFile = isFile && path.endsWith(".ts");
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

async function initControllers(data: { controllers: Controllers }): Promise<void> {
  Utils.trace('Controllers initialization');
  controllers = { ...data.controllers };
  const entries = Object.entries(data.controllers)
  for await(const [key, controller] of entries) {
    const protocol = (await Deno.transpileOnly({
      "/transpiled.ts": controller.protocol
    }, { sourceMap: false }))["/transpiled.ts"].source
    controllers[key].protocol = (eval(protocol));
    const run = eval(controller.runtime);
    if (typeof run === 'function') {
      const instance = new controllers[key].protocol();
      controllers[key].runtime = run.bind(instance);
    }
  }
}

self.onmessage = async (e: any): Promise<void> => {
  Utils.trace(`Worker: Dev Server received a message`);
  const { application, Configuration, type } = e.data;
  if (type === Workers.INIT_MESSAGE_SERVICE_DEV) {
    await initControllers(e.data);
  }
  const port: number = Configuration.port;
  // open the server
  const server = serve({ port });

  // start rendering Ogone system
  if (!Configuration.entrypoint || !existsSync(Configuration.entrypoint)) {
    server.close();
    Utils.error(
      `can't find entrypoint, please specify a correct path. input: ${Configuration.entrypoint}`,
    );
  }
  if (!("port" in Configuration) || typeof Configuration.port !== "number") {
    Utils.error(
      "please provide a port for the server. it has to be a number.",
    );
  }
  Utils.trace(`Worker: Dev Server available on http://localhost:${Configuration.port}/`);
  Utils.success(`Your application is running here: http://localhost:${Configuration.port}/`);
  self.postMessage(Workers.SERVICE_DEV_READY);

  for await (const req of server) {
    const pathToPublic: string = `${Deno.cwd()}/${Configuration.static ? Configuration.static.replace(/^\//, '') : ''
      }/${req.url}`.replace(/\/+/gi, '/');
    const params = new URLSearchParams('?' + req.url.split("?")[1]);
    const importedFile = params.get('import');
    const controllerRendered = await control(req);
    if (controllerRendered) {
      continue;
    }
    let isUrlFile: boolean = existsSync(pathToPublic);
    switch (true) {
      case importedFile && existsSync(importedFile as string) && Deno.statSync(importedFile as string).isFile:
        // TODO fix HMR
        // use std websocket
        // HMR(denoReqUrl);
        req.respond({
          body: await resolveAndReadText(importedFile!),
          headers: new Headers([
            getHeaderContentTypeOf(importedFile!),
            ["X-Content-Type-Options", "nosniff"],
          ]),
        });
        break;
      case isUrlFile && Deno.statSync(pathToPublic).isFile:
        req.respond({
          body: Deno.readTextFileSync(pathToPublic),
          headers: new Headers([
            getHeaderContentTypeOf(req.url),
            ["X-Content-Type-Options", "nosniff"],
          ]),
        });
        break;
      default:
        req.respond({ body: application });
        break;
    }
  }
}
export {};