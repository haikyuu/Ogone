import ComponentsSubscriber from "./ComponentsSubscriber.ts";
import StylesheetBuilder from "./StylesheetBuilder.ts";
import ComponentBuilder from "./ComponentBuilder.ts";
import ImportsAnalyzer from "./ImportsAnalyzer.ts";
import SwitchContextBuilder from "./SwitchContextBuilder.ts";
import ComponentCompiler from "./ComponentCompiler.ts";
import NodeAnalyzerCompiler from "./NodeAnalyzerCompiler.ts";
import ComponentTopLevelAnalyzer from "./ComponentTopLevelAnalyzer.ts";
import StoreArgumentReader from "./StoreArgumentReader.ts";
import type { Bundle } from "../.d.ts";
import { Utils } from "./Utils.ts";
import ProtocolDataProvider from './ProtocolDataProvider.ts';
import ComponentTypeGetter from './ComponentTypeGetter.ts';
import ForFlagBuilder from './ForFlagBuilder.ts';

/**
 * @name Constructor
 * @code OC0
 * @description step 0 for the application, this create the bundle of all the components and return it
 * by using the method getBundle
 * ```ts
 *  Constructor.getBundle(entrypoint: string): Promise<Bundle>
 * ```
 */
export default class Constructor extends Utils {
  private StoreArgumentReader: StoreArgumentReader =
    new StoreArgumentReader();
  private ComponentTypeGetter: ComponentTypeGetter = new ComponentTypeGetter();
  private ProtocolDataProvider: ProtocolDataProvider = new ProtocolDataProvider();
  private ComponentTopLevelAnalyzer: ComponentTopLevelAnalyzer = new ComponentTopLevelAnalyzer();
  private ComponentCompiler: ComponentCompiler = new ComponentCompiler();
  private SwitchContextBuilder: SwitchContextBuilder = new SwitchContextBuilder();
  private NodeAnalyzerCompiler: NodeAnalyzerCompiler = new NodeAnalyzerCompiler();
  private StylesheetBuilder: StylesheetBuilder = new StylesheetBuilder();
  private ForFlagBuilder: ForFlagBuilder = new ForFlagBuilder();
  /**
   * saves modules and imported components inside component.imports[index]: string;
   */
  private ImportsAnalyzer: ImportsAnalyzer =
    new ImportsAnalyzer();
  /**
   * instance to inspect the use statements inside the component
   */
  private ComponentsSubscriber: ComponentsSubscriber =
    new ComponentsSubscriber();
  /**
   * instance to read the components inside the bundle
   * this instance will assign the rootnode Element to the component
   */
  private ComponentBuilder: ComponentBuilder = new ComponentBuilder();
  async getBundle(entrypoint: string): Promise<Bundle> {
    const bundle: Bundle = {
      files: [],
      datas: [],
      context: [],
      classes: [],
      contexts: [],
      customElements: [],
      // @ts-ignore
      components: new Map(),
      // @ts-ignore
      mapRender: new Map(),
      // @ts-ignore
      mapClasses: new Map(),
      // @ts-ignore
      mapContexts: new Map(),
      render: [],
      remotes: [],
      repository: {},
      types: {
        component: true,
        store: false,
        async: false,
        router: false,
        controller: false,
      },
    };
    this.trace('Bundle created');

    // @code OCS1
    await this.ComponentsSubscriber.inspect(entrypoint, bundle);
    this.trace('Subscriptions done');

    // @code OCB2
    await this.ComponentBuilder.read(bundle);
    this.trace('Components created');

    // get the type for all the components
    this.ComponentTypeGetter.setTypeOfComponents(bundle);
    this.trace('Components Protocol\'s Type Checking');

    // @code OIA3
    await this.ImportsAnalyzer.inspect(bundle);
    this.trace('Imports Checking');

    // @code OCTLA5
    await this.ComponentTopLevelAnalyzer.switchRootNodeToTemplateNode(bundle);
    this.trace('Root Node changed to the template node');

    // --for flag - creates sub context
    this.ForFlagBuilder.startAnalyze(bundle);
    this.trace('Contexts analyzes done');

    // move back after second runtime
    await this.SwitchContextBuilder.startAnalyze(bundle);
    this.trace('Switch block context created');
    // @code OPDP
    await this.ProtocolDataProvider.read(bundle);
    this.trace('Component\'s data provided');

    this.ComponentTypeGetter.assignTypeConfguration(bundle);
    this.trace('Last Component configurations');

    // @code OSAR6
    this.StoreArgumentReader.read(bundle);
    this.trace('Store Components analyze done');

    // @code OSB7
    await this.StylesheetBuilder.read(bundle);
    this.trace('Style Sheet done');

    // @code OCTLA5
    await this.ComponentTopLevelAnalyzer.cleanRoot(bundle);
    this.trace('Component\'s Top level checked');

    // runtime
    await this.ComponentCompiler.startAnalyze(bundle);
    await this.NodeAnalyzerCompiler.startAnalyze(bundle);
    return bundle;
  }
}
