// SSR shell for the home-page hero carousel.
//
// Every web-route page is wrapped in the app chrome (header, footer and the
// theme-bridge frame). None of it may appear inside the hero iframe, and it must
// not occupy layout either — so the wrapper is removed from flow and only our
// container is shown, the same trick `.web/components/theme-bridge/render.js`
// uses in reverse.
//
// Sizing lives on the AUP side: the frame primitive has no `style` prop, and its
// `autoHeight` did not take effect, so the parent uses the supported
// `aspectRatio` and this document simply fills whatever height it is given.
export function render() {
  return {
    html:
      '<style>html,body{background:transparent!important;margin:0!important;padding:0!important;height:100%;overflow:hidden}' +
      'body>div:not(.hero-carousel),body>header,body>footer{display:none!important}' +
      '.hero-carousel{height:100%}</style>' +
      '<div class="hero-carousel" data-hero-carousel><div class="hero-carousel__skeleton" aria-hidden="true"></div></div>',
  };
}
