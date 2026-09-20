export function render() {
  // The blocklet web handler wraps every SSR page in the app wrapper
  // (header/footer and this same bridge frame). None of that chrome may be
  // visible — the frame overlay covers the host page — so make the document
  // fully transparent and its content invisible. Scripts still run.
  return {
    html:
      '<style>html,body{background:transparent!important}body{visibility:hidden}</style>' +
      '<div class="theme-bridge" hidden aria-hidden="true"></div>',
  };
}
