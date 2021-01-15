export default abstract class OgoneWorkers {
  // workers
  public static serviceDev = new Worker(new URL("../workers/server-dev.ts", import.meta.url).href, {
    type: "module",
    deno: true,
  });
  public static lspWebsocketClientWorker = new Worker(new URL("../workers/lsp-websocket-client.ts", import.meta.url).href, {
    type: "module",
    deno: true,
  });
}