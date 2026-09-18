export function render(ctx) {
  const { slots = {} } = ctx;
  return { html: Object.values(slots).filter(Boolean).join("\n") };
}
