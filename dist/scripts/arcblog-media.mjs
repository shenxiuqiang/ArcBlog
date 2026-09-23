#!/usr/bin/env node
// ArcBlog media index — spec §12 `/arcblog/content/media`.
//
// One record per uploaded asset. This indexes where the binary lives; it does
// not move bytes. Admin-only (the index exposes upload paths). Stored at
// `/instance/app/arcblog/media/<id>.json`.

import { ensure, fail, optString, parseArgs, resolveInstance } from './lib/arc.mjs';
import { MEDIA_DIR, getMedia, listMedia, putMedia, removeMedia } from './lib/media.mjs';
import { slugify } from './lib/util.mjs';

function commandAdd(opts, instance) {
  const id = slugify(opts.id ?? opts.path);
  ensure(id, 'media id is required (--id or --path)');
  const existing = getMedia(id, instance);
  if (existing && !opts.update) {
    fail('CONFLICT', `media already exists: ${id} (use --update to overwrite)`);
  }
  const record = putMedia(
    {
      id,
      path: optString(opts.path),
      title: opts.title !== undefined ? optString(opts.title) : undefined,
      alt: opts.alt !== undefined ? optString(opts.alt) : undefined,
      mimeType: opts.mime !== undefined ? optString(opts.mime) : undefined,
      size: opts.size,
      width: opts.width,
      height: opts.height,
      uploaderDid: opts['uploader-did'] !== undefined ? optString(opts['uploader-did']) : undefined,
    },
    instance,
  );
  console.log(
    JSON.stringify({ ok: true, action: existing ? 'media-update' : 'media-add', path: `${MEDIA_DIR}/${record.id}.json`, media: record }, null, 2),
  );
}

function commandList(opts, instance) {
  const media = listMedia(instance);
  console.log(JSON.stringify({ ok: true, path: MEDIA_DIR, count: media.length, media }, null, 2));
}

function commandShow(opts, instance) {
  const id = slugify(opts.id);
  ensure(id, 'media id is required (--id)');
  const record = getMedia(id, instance);
  if (!record) fail('NOT_FOUND', `media not found: ${id}`);
  console.log(JSON.stringify({ ok: true, path: `${MEDIA_DIR}/${id}.json`, media: record.value }, null, 2));
}

function commandRemove(opts, instance) {
  const id = slugify(opts.id);
  ensure(id, 'media id is required (--id)');
  const removed = removeMedia(id, instance);
  console.log(JSON.stringify({ ok: true, action: 'media-remove', id: removed, path: `${MEDIA_DIR}/${removed}.json` }, null, 2));
}

function help() {
  console.log(`ArcBlog media index (spec §12 /arcblog/content/media)

Usage:
  node scripts/arcblog-media.mjs add --path <afs-path> [--id <id>] [--title <t>] [--alt <text>]
                                      [--mime <type/subtype>] [--size <bytes>]
                                      [--width <px>] [--height <px>] [--uploader-did <did>] [--update]
  node scripts/arcblog-media.mjs list
  node scripts/arcblog-media.mjs show --id <id>
  node scripts/arcblog-media.mjs remove --id <id>

Options:
  --instance <name>   target a named ARC instance (default: default instance)

The id defaults to the file's basename (cover.png -> cover). Records index the
binary; removing a record never deletes the file.
`);
}

(function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd] = args._;
  const instance = resolveInstance(args);
  try {
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
    if (cmd === 'add' || cmd === 'set') return commandAdd(args, instance);
    if (cmd === 'list' || cmd === 'ls') return commandList(args, instance);
    if (cmd === 'show') return commandShow(args, instance);
    if (cmd === 'remove' || cmd === 'rm') return commandRemove(args, instance);
    fail('VALIDATION', `unknown command: ${cmd}`);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, code: err.code || 'RUNTIME_ERROR', error: err.message }, null, 2));
    process.exit(1);
  }
})();
