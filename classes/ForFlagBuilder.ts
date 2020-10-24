import { Utils } from "./Utils.ts";
import type {
  Bundle,
  XMLNodeDescription,
  LegacyDescription,
  ForCtxDescription,
} from "../.d.ts";
function* gen(i: number): Generator {
  yield i;
  while (true) {
    yield i++;
  }
}
const iterator: Generator = gen(0);
const arrayAliasIterator: Generator = gen(0);
iterator.next().value
arrayAliasIterator.next().value
/**
 * @name ForFlagBuilder
 * @code OFFB1-ORC8-OC0
 * @description traverse all nodes, if the `--for` flag is set this will start getting all the tokens through a regular expression
 * this will send to the SwitchContextBuilder, all the variable declarations
 * (variables for any component's property: const item = this.item)
 * SwitchContextBuilder class will wrap it into a tiny function and register it into `Ogone.context`
 * this is only a build made through a string composition
 */
export default class ForFlagBuilder extends Utils {
  public startAnalyze(bundle: Bundle) {
    const entries = bundle.components.entries();
    for (let [path, component] of entries) {
      this.read(bundle, path, component.rootNode);
    }
  }
  private read(
    bundle: Bundle,
    keyComponent: string,
    node: XMLNodeDescription,
    legacy: LegacyDescription = {
      limit: 0,
      ctx: {},
      script: [],
      getLengthDeclarationAfterArrayEvaluation: "",
      declarationScript: [],
      callbackDeclaration: "",
    },
  ) {
    try {
      const component = bundle.components.get(keyComponent);
      let contextLegacy: LegacyDescription = {};
      if (component && node.attributes) {
        const attrs = Object.keys(node.attributes);
        const keyData = Object.keys(component.data);
        attrs.forEach((key) => {
          if (!key.startsWith("--")) return;
          node.hasFlag = true;
          keyData.forEach((key2) => {
            if (
              // @ts-ignore
              node.attributes[key].indexOf &&
              // @ts-ignore
              node.attributes[key].indexOf(key2) > -1 &&
              !node.dependencies.includes(key2)
            ) {
              node.dependencies.push(key2);
            }
          });
        });
      }
      if (node.tagName) {
        if (!node.attributes) {
          node.attributes = {};
        }
        if (component && node.attributes) {
          node.attributes[component.uuid] = true;
        }
      }
      if (legacy) {
        contextLegacy = Object.assign(legacy, {});
      }
      if (node.attributes["--for"]) {
        const v = node.attributes["--for"];
        // get the flags
        const oForFlag = this.getForFlagDescription(v as string);
        const { item, index, array } = oForFlag;
        const arrayAlias = `_____a_${arrayAliasIterator.next().value}`;
        if (legacy.ctx) {
          if (legacy.ctx[item]) {
            this.error(
              `'${item}' is already defined in the template, as item`,
            );
          }
          if (legacy.ctx[index]) {
            this.error(
              `'${index}' is already defined in the template, as index`,
            );
          }
          legacy.ctx[index] = true;
          legacy.ctx[item] = oForFlag;
          node.hasFlag = true;
          const getLengthScript = (opts: any) => {
            if (!opts.filter) {
              return `
                  if (GET_LENGTH) {
                    if (!${arrayAlias}) {
                      return 0;
                    }
                    return ${arrayAlias}.length;
                  }`;
            }
            return this.template(
              `
                let {{ arrayAlias }}2 = ({{ arrayAlias }} || []).filter(({{item}}, {{index}}) => {{filter}});
                {{item}} = ({{ arrayAlias }}2)[{{index}}];
                if (GET_LENGTH) {
                  return ({{ arrayAlias }}2).length;
                }`,
              {
                item,
                index,
                arrayAlias,
                filter: opts.filter,
              },
            );
          };
          legacy.arrayName = array;
          legacy.getLength = getLengthScript;
          // @ts-ignore
          legacy.item = item;
          if (contextLegacy) {
            const declarationScript = [`const ${arrayAlias} =
              !!${array.split(/(?<!\bthis)(\.)/)[0]}
              && ${array} || [];`, `
                          let ${index} = POSITION[${contextLegacy.limit}],
                          ${item} = (${arrayAlias})[${index}];`];
            if (contextLegacy && contextLegacy.declarationScript) {
              contextLegacy.declarationScript = contextLegacy.declarationScript
                .concat(declarationScript);
            }
          }
        }
      }
      if (node.childNodes?.length) {
        node.childNodes
          .forEach((el, i) => {
            if (component && component.data && el.nodeType === 3) {
              const data = el.rawText;
              Object.keys(component.data).forEach((key) => {
                const result = data;
                // need to be more precise here
                if (
                  result &&
                  result.indexOf("\${") > -1 && result.indexOf(`${key}`) > -1
                ) {
                  if (!node.dependencies.includes(key)) {
                    node.dependencies.push(key);
                  }
                }
              });
            }
            if (contextLegacy) {
              this.read(bundle, keyComponent, el, {
                ...contextLegacy,
                ctx: { ...contextLegacy.ctx },
                declarationScript: [
                  ...(contextLegacy && contextLegacy.declarationScript
                    ? contextLegacy.declarationScript
                    : []),
                ],
                callbackDeclaration: "",
                // @ts-ignore
                limit: contextLegacy.limit + 1,
              });
            }
          });
      }
      if (contextLegacy) {
        const value = `${contextLegacy.declarationScript
          ? contextLegacy.declarationScript.join("")
          : ""
          } `;
        contextLegacy.script = {
          value,
          node,
          // @ts-ignore
          item: legacy.item,
          ctx: legacy.ctx,
          level: contextLegacy.limit,
          getLength: legacy.getLength,
          array: legacy.arrayName,
        };
        if (component && node.id) {
          component.for[node.id] = contextLegacy;
        }
      }
    } catch (oRenderDOMException) {
      this.error(oRenderDOMException);
    }
  }
  getForFlagDescription(
    flagValue: string,
  ): ForCtxDescription<string> {
    if (flagValue.indexOf("as") === -1) {
      throw this.error(
        `Syntax Error: ${flagValue}, no (as) found \n\tPlease follow this --for syntax. arrayName as (item [, i]) `,
      );
    }
    const oForRegExp =
      /(.*?)\sas\s\(([^,\s\n\t]*)+,{0,1}\s{0,1}(([^,\s\n\t]*)+){0,1}\)/gi
        .exec(
          flagValue,
        );
    if (!oForRegExp) {
      throw this.error(
        `Syntax Error: ${flagValue} \n\tPlease follow this --for syntax. arrayName as (item [, i]) `,
      );
    }
    let [, arrayName, item, index] = oForRegExp;
    arrayName = flagValue.split("as")[0].trim();
    return {
      index: index ? index : `i${iterator.next().value}`,
      item,
      array: arrayName,
      content: flagValue,
    };
  }
}
