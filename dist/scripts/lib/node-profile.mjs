// Node Profile domain logic — pure functions, no ARC or filesystem access.
//
// Spec: §7 (roles: Basic / Studio / Hub), §11 (capability engine instead of
// scattered `if (isHub)`), §107–§109 (Studio / Hub / Network profile fields).

/** The three node states from spec §7. `basic` is implicit for every instance. */
export const NODE_ROLES = ['basic', 'studio', 'hub'];

/** Capabilities every ArcBlog instance has (spec §11). */
export const BASE_CAPABILITIES = ['blog.read', 'blog.write', 'blog.publish'];

/** Capabilities a role activates (spec §11). */
export const ROLE_CAPABILITIES = {
  studio: ['studio.publish', 'studio.register', 'studio.rss', 'studio.payments'],
  hub: ['hub.discovery', 'hub.index', 'hub.search', 'hub.aggregate', 'hub.route', 'hub.recommend'],
};

/** Every capability the spec names, used to reject typos. */
export const KNOWN_CAPABILITIES = [
  ...BASE_CAPABILITIES,
  ...ROLE_CAPABILITIES.studio,
  ...ROLE_CAPABILITIES.hub,
];

function str(value) {
  if (value === undefined || value === null || value === true || value === false) return '';
  return String(value).trim();
}

function localNow() {
  return new Date().toISOString();
}

/** How this node's identity was established (mirrors `arc did init` modes). */
export const NODE_AUTH_METHODS = ['developer', 'provider', 'blocklet', 'did-connect'];

/** Normalize + validate a role list. Throws `VALIDATION` on an unknown role. */
export function normalizeRoles(value) {
  const list = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
  const seen = [];
  for (const raw of list) {
    const role = str(raw).toLowerCase();
    if (!role) continue;
    if (!NODE_ROLES.includes(role)) {
      const err = new Error(`VALIDATION: unknown role "${role}" (allowed: ${NODE_ROLES.join(', ')})`);
      err.code = 'VALIDATION';
      throw err;
    }
    if (!seen.includes(role)) seen.push(role);
  }
  return seen.length ? seen : ['basic'];
}

/** Normalize + validate a capability list. Throws `VALIDATION` on an unknown capability. */
export function normalizeCapabilities(value) {
  const list = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
  const seen = [];
  for (const raw of list) {
    const capability = str(raw);
    if (!capability) continue;
    if (!KNOWN_CAPABILITIES.includes(capability)) {
      const err = new Error(
        `VALIDATION: unknown capability "${capability}" (allowed: ${KNOWN_CAPABILITIES.join(', ')})`,
      );
      err.code = 'VALIDATION';
      throw err;
    }
    if (!seen.includes(capability)) seen.push(capability);
  }
  return seen;
}

/** Capabilities implied by a role list (spec §11: role -> capability). */
export function capabilitiesForRoles(roles) {
  const list = Array.isArray(roles) ? roles : normalizeRoles(roles);
  const out = [...BASE_CAPABILITIES];
  for (const role of list) {
    for (const capability of ROLE_CAPABILITIES[role] ?? []) {
      if (!out.includes(capability)) out.push(capability);
    }
  }
  return out;
}

/**
 * Extract the scalar keys ArcBlog needs from a `blocklet.yaml` text.
 * Deliberately minimal (no YAML dependency): top-level `key: value` lines only.
 */
export function parseManifest(text) {
  const out = {};
  for (const line of String(text ?? '').split('\n')) {
    if (!line || /^[\s#]/.test(line)) continue;
    const match = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

/**
 * Build a Node Profile record (spec §107–§109).
 * `existing` carries createdAt forward so an update never resets it.
 */
export function buildNodeProfile(input = {}, { now = new Date().toISOString(), existing = null } = {}) {
  const roles = normalizeRoles(input.roles ?? existing?.roles ?? ['basic']);
  const capabilities = normalizeCapabilities(
    input.capabilities ?? existing?.capabilities ?? capabilitiesForRoles(roles),
  );
  return {
    name: str(input.name ?? existing?.name),
    description: str(input.description ?? existing?.description),
    avatar: str(input.avatar ?? existing?.avatar),
    did: str(input.did ?? existing?.did),
    endpoint: str(input.endpoint ?? existing?.endpoint),
    roles,
    capabilities,
    version: str(input.version ?? existing?.version),
    protocolVersion: str(input.protocolVersion ?? existing?.protocolVersion ?? '1'),
    createdAt: str(existing?.createdAt ?? input.createdAt ?? now),
    updatedAt: now,
  };
}

/** Validate a Node Profile. Returns `{ok, issues, warnings}` (never throws). */
/**
 * Build a Node Identity record (spec §12 `/arcblog/node/identity`).
 * Records who this node is and how the identity was established; `existing`
 * carries createdAt forward.
 */
export function buildNodeIdentity(input = {}, { now = localNow(), existing = null } = {}) {
  return {
    did: str(input.did ?? existing?.did),
    authMethod: str(input.authMethod ?? existing?.authMethod ?? 'blocklet').toLowerCase(),
    caller: str(input.caller ?? existing?.caller),
    blockletDid: str(input.blockletDid ?? existing?.blockletDid),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

/** Validate a Node Identity record. Returns `{ok, issues}` (never throws). */
export function validateNodeIdentity(identity) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    return { ok: false, issues: ['identity must be an object'] };
  }
  const issues = [];
  if (!str(identity.did)) issues.push('did is required');
  else if (!/^did:/.test(str(identity.did))) issues.push('did must start with "did:"');
  if (!str(identity.authMethod)) issues.push('authMethod is required');
  else if (!NODE_AUTH_METHODS.includes(str(identity.authMethod))) {
    issues.push(`authMethod must be one of: ${NODE_AUTH_METHODS.join(', ')}`);
  }
  return { ok: issues.length === 0, issues };
}

/** Validate a Node Profile. Returns `{ok, issues, warnings}` (never throws). */
export function validateNodeProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { ok: false, issues: ['profile must be an object'], warnings: [] };
  }
  const issues = [];
  if (!str(profile.name)) issues.push('name is required');
  if (!str(profile.did)) issues.push('did is required');
  else if (!/^did:/.test(str(profile.did))) issues.push('did must start with "did:"');
  if (!str(profile.version)) issues.push('version is required');
  if (!str(profile.protocolVersion)) issues.push('protocolVersion is required');

  if (!Array.isArray(profile.roles) || profile.roles.length === 0) {
    issues.push('roles must be a non-empty array');
  } else {
    for (const role of profile.roles) {
      if (!NODE_ROLES.includes(role)) issues.push(`unknown role: ${role}`);
    }
  }
  if (!Array.isArray(profile.capabilities)) {
    issues.push('capabilities must be an array');
  } else {
    for (const capability of profile.capabilities) {
      if (!KNOWN_CAPABILITIES.includes(capability)) issues.push(`unknown capability: ${capability}`);
    }
  }
  if (profile.endpoint && !/^https?:\/\//i.test(str(profile.endpoint))) {
    issues.push('endpoint must be http(s)');
  }

  const warnings = [];
  if (Array.isArray(profile.roles) && Array.isArray(profile.capabilities)) {
    const missing = capabilitiesForRoles(profile.roles).filter(
      (capability) => !profile.capabilities.includes(capability),
    );
    if (missing.length) warnings.push(`capabilities missing for roles: ${missing.join(', ')}`);
  }
  return { ok: issues.length === 0, issues, warnings };
}
