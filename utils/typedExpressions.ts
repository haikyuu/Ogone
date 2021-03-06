import type { TypedExpressions } from "../.d.ts";

export default (): TypedExpressions => ({
  blocks: {},
  parentheses: {},
  setters: {},
  imports: {},
  exports: {},
  require: [],
  use: {},
  properties: [],
  data: {},
  switch: {
    before: {
      each: null,
      cases: {},
    },
    cases: [],
    default: false,
  },
  reflections: [],
  protocol: "",
});
