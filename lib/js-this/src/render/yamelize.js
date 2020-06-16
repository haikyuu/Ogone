import { YAML } from "https://raw.githubusercontent.com/eemeli/yaml/master/src/index.js";
import templateReplacer from "../../../../utils/template-recursive.ts";

export default function (typedExpressions, expressions, prog) {
  let result = prog;
  const matches = prog.match(/([^\n\r]+){0,1}(def:)/gi);
  const DoubleDeclarationOfThisException = new Error(
    '[Ogone] double declaration of "def:" in component',
  );
  let previousDeclaration = [];
  if (matches) {
    matches.forEach((dec) => {
      if (previousDeclaration.includes(dec)) {
        throw DoubleDeclarationOfThisException;
      }
      previousDeclaration.push(dec);
      return;
    });
  }
  const p = prog.split(/(def|case[^:]+|default|before\s*[^:]+)\s*\:/gi);
  let data = p.find((el, i, arr) => arr[i - 1] && arr[i - 1] === "def");
  if (!data) return result;
  let def = p.find((el, i, arr) => arr[i + 1] && arr[i + 1] === data);
  let previous = data;
  data = templateReplacer(data, expressions);
  const declaration = `${def}:${previous}`;
  const yaml = YAML.parse(data);
  result = result.replace(declaration, "");
  typedExpressions.data = yaml;
  return result;
}