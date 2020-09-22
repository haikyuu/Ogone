import type { Bundle } from "../.d.ts";
import ForFlagBuilder from "./ForFlagBuilder.ts";
import SwitchContextBuilder from "./SwitchContextBuilder.ts";
import ComponentCompiler from "./ComponentCompiler.ts";
import NodeAnalyzerCompiler from "./NodeAnalyzerCompiler.ts";

export default class RuntimeCompiler {
  private ForFlagBuilder: ForFlagBuilder = new ForFlagBuilder();
  private ComponentCompiler: ComponentCompiler = new ComponentCompiler();
  private SwitchContextBuilder: SwitchContextBuilder = new SwitchContextBuilder();
  private NodeAnalyzerCompiler: NodeAnalyzerCompiler = new NodeAnalyzerCompiler();
  public async read(bundle: Bundle): Promise<void> {
    const entries = Array.from(bundle.components);
    for await (let [path, component] of entries) {
      this.ForFlagBuilder.read(bundle, path, component.rootNode);
      await this.ComponentCompiler.read(bundle, component);
      await this.SwitchContextBuilder.read(bundle, path);
      await this.NodeAnalyzerCompiler.read(bundle, path, component.rootNode);
    }
  }
}
