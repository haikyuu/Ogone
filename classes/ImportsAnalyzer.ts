import type { Bundle, ImportDescription } from "../.d.ts";
import { Utils } from "./Utils.ts";
import AssetsParser from './AssetsParser.ts';
/**
 * @name ImportsAnalyzer
 * @code OIA3
 * @description step to parse all the import statements
 * and to require the correct pattern for all the components name
 * ```ts
 *   ImportsAnalyzer.inspect(bundle as Bundle);
 * ```
 * @dependency AssetsParser
 */
export default class ImportsAnalyzer extends Utils {
  private AssetsParser: AssetsParser =
    new AssetsParser();
  public inspect(bundle: Bundle) {
    const entries = Array.from(bundle.components.entries());
    for (const [, component] of entries) {
      const firstNode = component.rootNode.childNodes.find((node) =>
        node.nodeType !== 3
      );
      if (firstNode) {
        const index = component.rootNode.childNodes.indexOf(firstNode);
        const textNodes = component.rootNode.childNodes.filter((node, id) =>
          node.nodeType === 3 && id < index
        );
        let declarations = ``;
        textNodes.forEach((node) => {
          declarations += node.rawText;
        });
        if (declarations.length) {
          // performance here
          const importBody = this.AssetsParser.parseImportStatement(declarations);
          if (importBody.body && importBody.body.imports) {
            const { imports } = importBody.body;
            component.deps = (Object.values(imports) as ImportDescription[]).filter((imp: ImportDescription) => !imp.isComponent) as ImportDescription[];
            component.dynamicImportsExpressions = Object.entries(imports)
              .filter(([key, imp]: [string, any]) => !imp.path.endsWith('.o3'))
              .map(
                ([key, imp]: [string, any]) => {
                  // TODO fix examples/tests/modules/index.ts
                  const hmrModule = {
                    registry: 'Ogone.mod',
                    variable: '',
                    path: imp.path,
                    isDefault: false,
                    isAllAs: false,
                    isMember: false,
                  };
                  if (imp.default) {
                    hmrModule.variable = imp.defaultName;
                    hmrModule.isDefault = true;
                    component.modules.push(imp.getHmrModuleSystem(hmrModule));
                  }
                  if (imp.allAs) {
                    hmrModule.variable = imp.allAsName;
                    hmrModule.isAllAs = true;
                    component.modules.push(imp.getHmrModuleSystem(hmrModule));
                  }
                  if (imp.object) {
                    hmrModule.isMember = true;
                    imp.members.forEach((element: any) => {
                      hmrModule.variable = element.alias || element.name;
                      component.modules.push(imp.getHmrModuleSystem(hmrModule));
                    });
                  }
                  return imp.dynamic('Ogone.imp', component.file);
                },
              ).join("\n");
            // @ts-ignore
            // save esm tokens for production
            component.esmExpressions = Object.entries(imports).map(
              ([key, imp]: [string, any]) => {
                if (imp.isComponent) return '';
                return imp.static(component.file);
              },
            ).join("\n");
          }
          if (importBody.body && importBody.body.imports) {
            // @ts-ignore
            Object.values(importBody.body.imports).forEach((item: any) => {
              if (!item.isComponent || !item.path.endsWith('.o3')) return;
              const pathComponent =
                bundle.repository[component.uuid][item.path];
              const tagName = item.defaultName;
              switch (true) {
                case !tagName:
                  this.error(
                    `this Ogone version only supports default exports.
                      input: import component ... from ${item.path}
                      component: ${component.file}
                    `,
                  );
                case tagName === "proto":
                  this.error(
                    `proto is a reserved tagname, don\'t use it as selector of your component.
                      input: import component ${item.defaultName} from ${item.path}
                      component: ${component.file}
                    `,
                  );
                case !tagName.match(/^([A-Z])((\w+))+$/):
                  this.error(
                    `'${tagName}' is not a valid component name. Must be PascalCase. please use the following syntax:

                      import component YourComponentName from '${item.path}'

                      input: import component ${item.defaultName} from ${item.path}
                      component: ${component.file}

                      note: if the component is typed you must provide the name into the tagName
                    `,
                  );
                case !!component.imports[tagName]:
                  this.error(
                    `component name already in use. please use the following syntax:

                      import component ${tagName}2 from '${item.path}'
import { ImportDescription } from '../';

                      input: import component ${item.defaultName} from ${item.path}
                      component: ${component.file}
                    `,
                  );
                default:
                  component.imports[tagName] = pathComponent;
                  break;
              }
            });
          }
          textNodes.forEach((node) => {
            node.rawText = "";
          });
          component.requirements = this.AssetsParser.parseRequireStatement(declarations).body.properties;
        }
      }
    }
  }
}
