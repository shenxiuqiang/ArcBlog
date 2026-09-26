export function render() {
  // Like the theme bridge: the frame overlays the host page, so nothing of this
  // document may be visible. Only the script runs.
  return {
    html:
      '<style>html,body{background:transparent!important}body{visibility:hidden}</style>' +
      '<div class="console-bridge" hidden aria-hidden="true"></div>',
  };
}
