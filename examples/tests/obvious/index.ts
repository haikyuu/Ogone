import o3 from "../../../mod.ts";

o3.run({
  entrypoint: "examples/tests/obvious/index.o3",
  port: 8083,
  modules: "/examples/modules",
});
