import { colors } from "../../deps/deps.ts";
import { Utils } from "./Utils.ts";
import { Component } from '../ogone.main.d.ts';
import { Configuration } from "./Configuration.ts";
import OgoneWorkers from "./OgoneWorkers.ts";
import Workers from "../enums/workers.ts";
/**
 * a class to display the errors inside the module
 */
interface ModuleErrorsDiagnostic {
  start?: {
    character: number;
    line: number;
  };
  end?: {
    character: number;
    line: number;
  };
  sourceLine?: string;
  messageText?: string;
  messageChain?: {
    messageText: string;
    category: number;
    code: number;
    next: Pick<ModuleErrorsDiagnostic, 'messageText' | 'category' | 'code'>[];
  }
  fileName?: string;
  category: number;
  code: number;
}
export abstract class ModuleErrors extends Utils {
  static checkDiagnostics(component: Component, diagnostics: unknown[], onError?: Function) {
    try {
      const { blue, red, gray, } = colors;
      function renderChainedDiags(chainedDiags: typeof diagnostics): string {
        let result = ``;
        const { red } = colors;
        if (chainedDiags && chainedDiags.length) {
          for (const d of chainedDiags) {
            const diag = d as (ModuleErrorsDiagnostic);
            result += red(`TS${diag.code} [ERROR] `);
            result += `${diag && diag.messageText}\n`
          }
        }
        return result;
      }
      if (diagnostics && diagnostics.length) {
        let errors = '';
        if (onError) {
          onError();
        }
        for (const d of diagnostics.filter(d => (d as ModuleErrorsDiagnostic).start)) {
          const diag = d as (ModuleErrorsDiagnostic);
          const start = diag.start && diag.start.character || 0;
          const end = diag.end && diag.end.character || 0;
          const underline = red(`${' '.repeat(start)}^${'~'.repeat(end - start - 1)}`)
          let sourceline = diag && diag.sourceLine || '';
          sourceline = gray(sourceline.substring(0, start)) + red(sourceline.substring(start, end)) + gray(sourceline.substring(end));
          // add the error
          errors += `
        ${red(`TS${diag && diag.code} [ERROR]`)} ${blue(diag && diag.messageChain && diag.messageChain.messageText || diag && diag.messageText || '')}
        ${blue(renderChainedDiags(diag && diag.messageChain && diag.messageChain.next || []))}
          ${sourceline}
          ${underline}
        at ${blue(diag && diag.fileName || '')}:${diag.start && diag.start.line + 1 || ''}:${diag.start && diag.start.character || ''}`;
          // TODO add errors, send them to the webview
        }
        this.ShowErrors(
          `${component.file}\n${errors}`,
        );
        if (!Configuration.OgoneDesignerOpened) {
          // if the webview isn't opened
          // this means the end user is not using the Ogone Designer
          // so we can exit
          Deno.exit(1);
        }
      } else {
        return;
      }
    } catch (err) {
      this.error(`ModuleErrors: ${err.message}`);
    }
  }
  static ShowErrors(message: string, opts?: { [k: string]: unknown }): void {
    try {
      const { bgRed, red, bold, yellow } = colors;
      const m: string = ModuleErrors.message(
        `${bgRed("  ERROR  ")} ${red(message)}`,
        { returns: true },
      ) as string;
      if (Configuration.OgoneDesignerOpened) {
        OgoneWorkers.lspWebsocketClientWorker.postMessage({
          type: Workers.LSP_ERROR,
          message: m,
        });
      }
      console.error(m);
    } catch (err) {
      this.error(`ModuleErrors: ${err.message}`);
    }
  }
}