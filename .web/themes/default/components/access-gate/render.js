function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rolePhrase(role) {
  const r = String(role || "").trim();
  if (r === "member") return "members";
  if (r === "admin") return "admins";
  if (r === "owner") return "owners";
  if (r) return r;
  return "signed-in readers";
}

export function render(ctx) {
  const { props, escapeHtml: esc } = ctx;
  const escHtml = typeof esc === "function" ? esc : escapeHtml;
  const kind = props.kind === "promo-shell" ? "promo-shell" : "preview-shell";
  const role = typeof props.requiredRole === "string" ? props.requiredRole : "";
  const excerpt = typeof props.excerpt === "string" ? props.excerpt.trim() : "";
  const href =
    typeof props.loginHref === "string" && props.loginHref
      ? props.loginHref
      : "/.well-known/service/login";
  const signInLabel =
    typeof props.signInLabel === "string" && props.signInLabel ? props.signInLabel : "Sign in";
  const message =
    typeof props.message === "string" && props.message
      ? props.message
      : kind === "preview-shell"
        ? `The rest of this piece is for ${rolePhrase(role)}.`
        : `This piece is for ${rolePhrase(role)}.`;
  const signedIn = props.signedIn === true;

  const excerptHtml =
    kind === "preview-shell" && excerpt
      ? `<p class="access-gate-excerpt">${escHtml(excerpt)}</p>`
      : "";
  const actionHtml = signedIn
    ? ""
    : `<p class="access-gate-action">
    <a class="access-gate-signin" href="${escHtml(href)}">${escHtml(signInLabel)}</a>
  </p>`;

  return {
    html: `<aside class="access-gate" data-kind="${escHtml(kind)}"${
      role ? ` data-required-role="${escHtml(role)}"` : ""
    }>
  <div class="access-gate-rule" aria-hidden="true"></div>
  ${excerptHtml}
  <p class="access-gate-message">${escHtml(message)}</p>
  ${actionHtml}
</aside>`,
  };
}
