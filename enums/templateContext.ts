export enum Context {
  /**
   * proper checks for cases
   */
  CASE_GATE = `
    // @ts-ignore
  if (typeof _state === "string" && ![{{ declaredCases }}].includes(_state)) {
    return;
  }`,

  /**
   * template for the runtime of the component
   */
  TEMPLATE_COMPONENT_RUNTIME = `({{ async }} function ({{ protocolAmbientType }} _state: _state, ctx: ctx, event: event, _once: number = 0) {
    try {
      {{ body }}
    } catch(err) {
      // @ts-ignore
      Ogone.error('Error in the component: \\n\\t {{ file }}' ,err.message, err);
      throw err;
    }
  });`,

  /**
   * the statements of the component
   * this is the body part inserted into TEMPLATE_COMPONENT_RUNTIME
   */
  TEMPLATE_COMPONENT_RUNTIME_BODY = `
    {{ beforeEach }}
    {{ reflections }}
    {{ caseGate }}
    switch(_state) { {{ switchBody }} }`

}