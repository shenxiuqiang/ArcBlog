/** Typings for the JS default-theme renderer imported by tests. */
export function render(ctx: {
  props: Record<string, unknown>;
  escapeHtml: (value: string) => string;
}): { html: string };
