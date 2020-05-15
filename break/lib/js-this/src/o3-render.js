import gen from "./generator.js";
import expressions from "./expressions.js";
let rid = 0;

export default [
  // reflection regexp this.name => {};
  // reflection is the same feature for computed datas but with the following syntax
  // this.reflected => { return Math.random() };
  // TODO
  {
    name: "reflection",
    open: false,
    reg:
      /(§{2})(keywordThis\d+)(§{2})\s*(§{2})(identifier\d+)(§{2})\s*(§{2})(arrowFunction\d+)(§{2})\s*(§{2})(block\d+)(§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      const id = `§§reflection${gen.next().value}§§`;
      expressions[id] = value;
      return id;
    },
    close: false,
  },
  // simplify from '' syntax
  {
    open: false,
    reg: /(§{2})(keywordFrom\d+)(§{2})\s*(§{2})(string\d+)(§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      const id = `§§pathImport${gen.next().value}§§`;
      typedExpressions.from[id] = value;
      expressions[id] = value;
      return id;
    },
    close: false,
  },
  // use syntax
  // use @/path/to/comp.o3 as element-name
  {
    // parse missing string
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordUse\d+§{2})\s*(§{2}path\d+§{2})\s*(§{2}keywordAs\d+§{2})\s+(?!§§string)/,
    id: (value, matches, typedExpressions, expressions) => {
      const MissingStringInUseExpressionException = new Error(
        "[Ogone] please follow this pattern for use expression: use @/absolute/path.o3 as <string>\n\n",
      );
      throw MissingStringInUseExpressionException;
    },
    close: false,
  },
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordUse\d+§{2})\s*(§{2}path\d+§{2})\s*(§{2}keywordAs\d+§{2})\s*(§{2}string\d+§{2})(\s*§{2}endPonctuation\d+§{2})*/,
    id: (value, matches, typedExpressions, expressions) => {
      const id = `§§use${gen.next().value}§§`;
      let path = expressions[matches[2]];
      while(Object.keys(expressions).find(k => path.indexOf(k) > -1)) {
        Object.keys(expressions).forEach((k) => {
          path = path.replace(k, expressions[k]);
        });
      }
      typedExpressions.use[id] = {
        path,
        as: expressions[matches[4]],
      };
      return "";
    },
    close: false,
  },
  // require syntax
  // require prop as constructor || any
  // require prop1, prop2 as constructor[]
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordRequire\d+§{2})\s*([^\§\(]*)+(§{2}keywordAs\d+§{2})\s*([^\§\[\]]*)+(§{2}(endLine|endPonctuation)\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      const id = `§§require${gen.next().value}§§`;
      const any = null;
      const isAlreadyRequired = typedExpressions.properties
        .find(([key]) => key === matches[2]);
      if (isAlreadyRequired) {
        const AlreadyRequiredPropertyException = new Error(
          `[Ogone] property ${matches[2]} is already required in component`,
        );
        throw AlreadyRequiredPropertyException;
      }
      const array = matches[2].split(",");
      if (array.length === 1) {
        typedExpressions.properties.push([array[0].trim(), [matches[4]]]);
      } else {
        array.forEach((key) => {
          typedExpressions.properties.push([key.trim(), [matches[4]]]);
        });
      }
      return "";
    },
    close: false,
  },
  {
    name: "declarations",
    open: false,
    reg:
      /(§{2}keywordRequire\d+§{2})\s*([^\§]*)+(§{2}keywordAs\d+§{2})\s*(§{2}array\d+§{2})\s*(§{2}endLine\d+§{2})/,
    id: (value, matches, typedExpressions, expressions) => {
      const id = `§§require${gen.next().value}§§`;
      const any = { name: null };
      const keys = matches[2].replace(/\s/gi, "").split(",");
      const props = keys
        .map((key) => {
          const isAlreadyRequired = typedExpressions.properties
            .find(([key2]) => key2 === key);
          if (isAlreadyRequired) {
            const AlreadyRequiredPropertyException = new Error(
              `[Ogone] property ${key} is already required in component`,
            );
            throw AlreadyRequiredPropertyException;
          }
          return [
            key,
            eval(expressions[matches[4]]).filter((f) => f).map((f) => f.name),
          ];
        });
      typedExpressions.properties.push(...props);
      return "";
    },
    close: false,
  },
  {
    name: "linkCases",
    open: false,
    reg:
      /\s*(\*){0,1}execute\s+(§{2}keywordCase\d+§{2})([\s\n]*)(§{2}string\d+§{2})\s*(§{2}keywordUse\d+§{2})\s*(§{2}array\d+§{2})\s*(§{2}(endLine|endPonctuation)\d+§{2})/,
    id: (value, match, typedExpressions, expressions) => {
      const [input, runOnce, keywordCase, spaces, string, keywordUse, array] =
        match;
      if (!runOnce) {
        rid++;
        return `_once !== ${rid} ? ____r(${expressions[string]}, ${
          expressions[array]
        }, ${rid}) : null; break;`;
      }
      return `____r(${expressions[string]}, ${
        expressions[array]
      }, _once || null); break;`;
    },
    close: false,
  },
  {
    name: "linkCases",
    open: false,
    reg:
      /\s*(\*){0,1}execute\s+(§{2}keywordCase\d+§{2})([\s\n]*)(§{2}string\d+§{2})\s*(§{2}(endLine|endPonctuation)\d+§{2})/,
    id: (value, match, typedExpressions, expressions) => {
      const [input, runOnce, keywordCase, spaces, string] = match;
      if (!runOnce) {
        rid++;
        return `_once !== ${rid} ? ____r(${
          expressions[string]
        }, [], ${rid}) : null; break;`;
      }
      return `____r(${expressions[string]}, [], _once || null); break;`;
    },
    close: false,
  },
  {
    name: "linkCases",
    open: false,
    reg:
      /\s*(\*){0,1}execute\s+(§{2}keywordDefault\d+§{2})\s*(§{2}(endLine|endPonctuation)\d+§{2})/,
    id: (value, match, typedExpressions, expressions) => {
      const [inpute, runOnce] = match;
      if (!runOnce) {
        rid++;
        return `_once !== ${rid} ? ____r(0, [], ${rid}) : null; break;`;
      }
      return `____r(0, [], _once || null); break;`;
    },
    close: false,
  },
  {
    name: "linkCases",
    open: false,
    reg: /\s*(\*){0,1}execute\s+(§{2}(keywordDefault|keywordCase)\d+§{2})\s*/,
    id: (value, match, typedExpressions, expressions) => {
      const UnsupportedSyntaxOfCaseExecutionException = new SyntaxError(`
      [Ogone] the following syntax is not supported\n
        please one of those syntaxes:
          execute case 'casename' use [ctx, event];
          execute case 'casename';
          execute default;
        It assumes that cases are strings in proto.
        It can change in the future, do not hesitate to make a pull request on it.
      `);
      throw UnsupportedSyntaxOfCaseExecutionException;
    },
    close: false,
  },
];