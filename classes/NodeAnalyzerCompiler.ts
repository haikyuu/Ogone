import type { Bundle, XMLNodeDescription } from "../.d.ts";
import WebComponentDefinition from "./WebComponentDefinition.ts";
/**
 * @name NodeAnalyzerCompiler
 * @code ONAC3-ORC8-OC0
 * @description this will throw errors if any error is found like:
 * BadUseOfAwaitInSyncComponentException, BadUseDeferFlagException, valid selector
 * if all is good, it will use an inherited method (render) to get the WebComponent definition.
 */
export default class NodeAnalyzerCompiler extends WebComponentDefinition {
  public async startAnalyze(bundle: Bundle): Promise<void> {
    const entries = Array.from(bundle.components);
    for await (let [path, component] of entries) {
      await this.read(bundle, path, component.rootNode);
    }
  }
  async read(
    bundle: Bundle,
    keyComponent: string,
    node: XMLNodeDescription,
  ): Promise<void> {
    const component = bundle.components.get(keyComponent);
    if (component) {
      const isImported: string = component.imports[node.tagName as string];
      const subcomp = bundle.components.get(isImported);
      if (
        node.attributes && node.attributes["--await"] &&
        component.type !== "async"
      ) {
        const BadUseOfAwaitInSyncComponentException =
          `--await must be used in an async component. define type="async" to the proto.\n Error in component: ${component.file}\n node: ${node.tagName}`;
        this.error(BadUseOfAwaitInSyncComponentException);
      }
      if (
        node.attributes && node.attributes["--await"] && isImported &&
        subcomp && subcomp.type !== "async"
      ) {
        const BadUseOfAwaitInSyncComponentException =
          `--await must be called only on async components. change type of <${node.tagName} --await /> or erase --await.\n Error in component: ${component.file}\n node: ${node.tagName}`;
        this.error(BadUseOfAwaitInSyncComponentException);
      }
      if (node.attributes && node.attributes["--defer"] && !isImported) {
        const BadUseDeferFlagException =
          `--defer must be called only on async components. discard <${node.tagName} --defer="${node.attributes["--defer"]
          }" />.\n Error in component: ${component.file}\n node: ${node.tagName}`;
        this.error(BadUseDeferFlagException);
      }
      if (
        node.attributes && node.attributes["--defer"] && isImported &&
        subcomp && subcomp.type !== "async"
      ) {
        const BadUseDeferFlagException =
          `--defer must be called only on async components. change type of <${node.tagName} --defer="${node.attributes["--defer"]
          }" /> or delete it.\n Error in component: ${component.file}\n node: ${node.tagName}`;
        this.error(BadUseDeferFlagException);
      }
      switch (true) {
        case subcomp &&
          ["async", "store", "router"].includes(subcomp.type) &&
          node.tagName &&
          !node.tagName.startsWith(`${subcomp.type[0].toUpperCase()}${subcomp.type.slice(1)}`):
          if (subcomp) {
            this.error(
              `'${node.tagName}' is not a valid selector of ${subcomp.type} component. please use the following syntax:
                import ${subcomp.type[0].toUpperCase()}${subcomp.type.slice(1)}${node.tagName} from '${isImported}';
                component: ${component.file}
              `,
            );
          }
      }
      const nodeIsDynamic = node.nodeType === 1  && Object.keys(node.attributes).find((key: string) => key.startsWith(':'))
      if (node.nodeType === 1 && node.childNodes && node.childNodes.length) {
        for await (const child of node.childNodes) {
          await this.read(bundle, keyComponent, child);
        }
      }
      if (node.tagName === null || (node.hasFlag && node.tagName) || nodeIsDynamic) {
        this.render(bundle, component, node);
      }
    }
  }
}
