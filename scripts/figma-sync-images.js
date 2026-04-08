#!/usr/bin/env node
/**
 * figma-sync-images.js — Canonical reference implementation
 *
 * Exports images from Figma and uploads them to HubSpot File Manager.
 * Idempotent via a local manifest file. Part of the BFJ Media Figma → HubSpot
 * automated pipeline (Tier 2 of the Image Asset Pipeline).
 *
 * Canonical copy:  D:\Jessiemar Works\BFJ\docs\scripts\figma-sync-images.js
 * Copy this into every new project's scripts/ folder as part of Phase 0.
 *
 * Zero npm dependencies — uses Node.js 18+ built-in `fetch`.
 *
 * ─── Required env vars ────────────────────────────────────────────────────
 *   FIGMA_TOKEN       Figma PAT with file_content:read scope
 *   HUBSPOT_TOKEN     HubSpot private app token with "files" scope
 *
 * ─── Optional env vars ────────────────────────────────────────────────────
 *   FIGMA_FILE_KEY    Default Figma file key (or set in figma-sync.config.json)
 *
 * ─── Project config (figma-sync.config.json at cwd) ───────────────────────
 *   {
 *     "figmaFileKey": "abc123",
 *     "defaultFolder": "/ProjectName/module-defaults"
 *   }
 *
 * ─── Manifest file ─ .figma-hubspot-manifest.json at cwd ──────────────────
 *   Auto-managed. Commit it. Treat as authoritative state.
 *
 * ─── CLI ──────────────────────────────────────────────────────────────────
 *   node figma-sync-images.js sync <node-id> [options]
 *   node figma-sync-images.js batch <plan.json> [options]
 *   node figma-sync-images.js list
 *   node figma-sync-images.js help
 *
 * Exit codes: 0 ok · 1 config/arg error · 2 network/API error · 3 upload failed
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Constants ──────────────────────────────────────────────────────────────
const MANIFEST_FILE = '.figma-hubspot-manifest.json';
const CONFIG_FILE = 'figma-sync.config.json';
const FIGMA_API = 'https://api.figma.com';
const HUBSPOT_API = 'https://api.hubapi.com';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

// ─── Small helpers ──────────────────────────────────────────────────────────
const log = (...a) => console.log('[figma-sync]', ...a);
const warn = (...a) => console.warn('[figma-sync]', ...a);
const errLog = (...a) => console.error('[figma-sync]', ...a);
const die = (msg, code = 1) => { errLog('ERROR:', msg); process.exit(code); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return null; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) args.flags[a.slice(2, eq)] = a.slice(eq + 1);
      else args.flags[a.slice(2)] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

// ─── Config loader ──────────────────────────────────────────────────────────
function loadConfig() {
  const cfgPath = path.join(process.cwd(), CONFIG_FILE);
  const fileCfg = fs.existsSync(cfgPath) ? (readJson(cfgPath) || {}) : {};
  return {
    figmaToken: process.env.FIGMA_TOKEN || fileCfg.figmaToken,
    hubspotToken: process.env.HUBSPOT_TOKEN || fileCfg.hubspotToken,
    figmaFileKey: process.env.FIGMA_FILE_KEY || fileCfg.figmaFileKey,
    defaultFolder: fileCfg.defaultFolder || '/module-defaults',
  };
}

function validateConfig(cfg) {
  if (!cfg.figmaToken) die('FIGMA_TOKEN env var (or figmaToken in figma-sync.config.json) required');
  if (!cfg.hubspotToken) die('HUBSPOT_TOKEN env var (or hubspotToken in figma-sync.config.json) required — needs "files" scope');
  if (!cfg.figmaFileKey) die('FIGMA_FILE_KEY env var (or figmaFileKey in figma-sync.config.json) required');
}

// ─── Manifest ───────────────────────────────────────────────────────────────
function loadManifest() {
  const file = path.join(process.cwd(), MANIFEST_FILE);
  return readJson(file) || { version: 1, entries: {} };
}
function saveManifest(manifest) {
  manifest.updated = new Date().toISOString();
  writeJson(path.join(process.cwd(), MANIFEST_FILE), manifest);
}
function manifestKey(node, format, scale) {
  return `${node}|${format}|${scale}`;
}

// ─── Figma REST API ─────────────────────────────────────────────────────────
async function figmaExportImages(cfg, nodeIds, format, scale) {
  const ids = nodeIds.join(',');
  const url = `${FIGMA_API}/v1/images/${cfg.figmaFileKey}` +
    `?ids=${encodeURIComponent(ids)}&format=${format}&scale=${scale}`;
  const res = await fetch(url, { headers: { 'X-Figma-Token': cfg.figmaToken } });
  if (!res.ok) throw new Error(`Figma /v1/images ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.err) throw new Error(`Figma export error: ${json.err}`);
  return json.images || {}; // { nodeId: s3Url }
}

// ─── HubSpot Files API ──────────────────────────────────────────────────────
async function hubspotImportFromUrl(cfg, opts) {
  const {
    url,
    name,
    folderPath,
    access = 'PUBLIC_NOT_INDEXABLE',
    overwrite = true,
  } = opts;

  const endpoint = `${HUBSPOT_API}/files/v3/files/import-from-url/async`;
  const body = {
    access,
    name,
    folderPath,
    url,
    overwrite,
    duplicateValidationStrategy: 'NONE',
    duplicateValidationScope: 'EXACT_FOLDER',
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.hubspotToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot import-from-url ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.id) throw new Error(`HubSpot import-from-url returned no task id: ${JSON.stringify(json)}`);
  return json.id;
}

async function hubspotGetTask(cfg, taskId) {
  const endpoint = `${HUBSPOT_API}/files/v3/files/import-from-url/async/tasks/${taskId}/status`;
  const res = await fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${cfg.hubspotToken}` },
  });
  if (!res.ok) throw new Error(`HubSpot task status ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function hubspotPollTask(cfg, taskId) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const task = await hubspotGetTask(cfg, taskId);
    const status = (task.status || '').toUpperCase();
    if (status === 'COMPLETE' || status === 'COMPLETED') return task;
    if (status === 'CANCELED' || status === 'FAILED' || status === 'ERROR') {
      throw new Error(`HubSpot import task ${status}: ${JSON.stringify(task)}`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('HubSpot import task timed out after ' + POLL_TIMEOUT_MS + 'ms');
}

function extractHubspotUrl(task) {
  // The response shape from HubSpot has evolved. Try known shapes in order.
  if (task.result && task.result.url) return { url: task.result.url, id: task.result.id };
  if (task.file && task.file.url) return { url: task.file.url, id: task.file.id };
  if (task.url) return { url: task.url, id: task.id };
  throw new Error('HubSpot task complete but no URL found in response: ' + JSON.stringify(task));
}

// ─── Core sync routine ──────────────────────────────────────────────────────
async function syncNode(cfg, manifest, node, opts) {
  const {
    name,
    format = 'svg',
    scale = 1,
    folder = cfg.defaultFolder,
    force = false,
    dryRun = false,
  } = opts || {};

  const key = manifestKey(node, format, scale);
  const existing = manifest.entries[key];
  if (existing && !force) {
    log(`skip (cached): ${node} → ${existing.hubspot_url}`);
    return { entry: existing, cached: true };
  }

  log(`export from Figma: ${node} (format=${format}${scale > 1 ? ', scale=' + scale : ''})`);
  const images = await figmaExportImages(cfg, [node], format, scale);
  const s3Url = images[node];
  if (!s3Url) throw new Error(`Figma returned no URL for node ${node}. Check node id and file key.`);

  const safeName = (name || `node-${node.replace(':', '-')}`).replace(/[^a-z0-9_\-]/gi, '-');
  const fullName = `${safeName}.${format}`;

  if (dryRun) {
    log(`[dry-run] would upload: ${fullName} → ${folder}`);
    return { entry: { dryRun: true, s3Url, name: safeName, folder }, cached: false };
  }

  log(`upload to HubSpot: ${folder}/${fullName}`);
  const taskId = await hubspotImportFromUrl(cfg, {
    url: s3Url,
    name: fullName,
    folderPath: folder,
  });

  log(`poll import task ${taskId}...`);
  const task = await hubspotPollTask(cfg, taskId);
  const { url: hubspotUrl, id: hubspotId } = extractHubspotUrl(task);

  const entry = {
    node,
    name: safeName,
    format,
    scale,
    folder,
    hubspot_id: hubspotId,
    hubspot_url: hubspotUrl,
    uploaded_at: new Date().toISOString(),
  };
  manifest.entries[key] = entry;
  log(`OK: ${hubspotUrl}`);
  return { entry, cached: false };
}

// ─── CLI commands ───────────────────────────────────────────────────────────
async function cmdSync(args) {
  const [node] = args._;
  if (!node) die('usage: sync <node-id> [--name=] [--format=svg|png|jpg] [--scale=] [--folder=] [--force] [--dry-run]');

  const cfg = loadConfig();
  validateConfig(cfg);
  const manifest = loadManifest();

  try {
    const { entry } = await syncNode(cfg, manifest, node, {
      name: args.flags.name,
      format: args.flags.format || 'svg',
      scale: parseInt(args.flags.scale || '1', 10),
      folder: args.flags.folder,
      force: !!args.flags.force,
      dryRun: !!args.flags['dry-run'],
    });
    if (!args.flags['dry-run']) saveManifest(manifest);
    console.log(JSON.stringify(entry, null, 2));
  } catch (e) {
    errLog(e.message);
    process.exit(2);
  }
}

async function cmdBatch(args) {
  const [planFile] = args._;
  if (!planFile) die('usage: batch <plan.json> [--force] [--dry-run]');
  if (!fs.existsSync(planFile)) die(`plan file not found: ${planFile}`);

  const plan = readJson(planFile);
  if (!plan || !Array.isArray(plan.items)) die('plan file must contain { "items": [...] }');

  const cfg = loadConfig();
  if (plan.figmaFileKey) cfg.figmaFileKey = plan.figmaFileKey;
  if (plan.defaultFolder) cfg.defaultFolder = plan.defaultFolder;
  validateConfig(cfg);

  const manifest = loadManifest();
  let uploaded = 0, skipped = 0, failed = 0;

  for (const item of plan.items) {
    if (!item.node) { errLog('plan item missing "node":', item); failed++; continue; }
    try {
      const { cached } = await syncNode(cfg, manifest, item.node, {
        name: item.name,
        format: item.format || 'svg',
        scale: item.scale || 1,
        folder: item.folder || cfg.defaultFolder,
        force: !!args.flags.force,
        dryRun: !!args.flags['dry-run'],
      });
      if (cached) skipped++; else uploaded++;
    } catch (e) {
      errLog(`failed node ${item.node}:`, e.message);
      failed++;
    }
  }

  if (!args.flags['dry-run']) saveManifest(manifest);
  log(`batch done: ${uploaded} uploaded, ${skipped} cached, ${failed} failed`);
  if (failed > 0) process.exit(3);
}

function cmdList() {
  const manifest = loadManifest();
  const entries = Object.entries(manifest.entries);
  if (entries.length === 0) { log('manifest is empty'); return; }
  console.log(`Manifest: ${entries.length} entries, updated ${manifest.updated || 'never'}\n`);
  for (const [key, e] of entries) {
    console.log(`${key}`);
    console.log(`  name:     ${e.name}.${e.format}`);
    console.log(`  folder:   ${e.folder}`);
    console.log(`  url:      ${e.hubspot_url}`);
    console.log(`  uploaded: ${e.uploaded_at}`);
    console.log('');
  }
}

function cmdHelp() {
  console.log(`
figma-sync-images.js — export Figma images into HubSpot File Manager
Part of the BFJ Figma → HubSpot automated pipeline.

Usage:
  node scripts/figma-sync-images.js sync <node-id> [options]
  node scripts/figma-sync-images.js batch <plan.json> [options]
  node scripts/figma-sync-images.js list
  node scripts/figma-sync-images.js help

Sync options:
  --name=<name>          File name in HubSpot (no extension)
  --format=svg|png|jpg   Export format (default: svg)
  --scale=<n>            Raster scale for png/jpg (default: 1)
  --folder=<path>        HubSpot folder path (default: cfg.defaultFolder)
  --force                Ignore manifest cache, re-upload
  --dry-run              Show what would happen, don't upload

Environment variables:
  FIGMA_TOKEN            Figma PAT with file_content:read (required)
  HUBSPOT_TOKEN          HubSpot PAT with "files" scope (required)
  FIGMA_FILE_KEY         Override figmaFileKey from config (optional)

Config file (${CONFIG_FILE} at cwd):
  {
    "figmaFileKey": "abc123",
    "defaultFolder": "/ProjectName/module-defaults"
  }

Manifest file (${MANIFEST_FILE} at cwd):
  Auto-managed. Commit to the repo. Treat as authoritative state.

Node 18+ required (uses built-in fetch). No npm dependencies.
`);
}

// ─── Entry point ────────────────────────────────────────────────────────────
(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (cmd) {
    case 'sync':  return cmdSync(args);
    case 'batch': return cmdBatch(args);
    case 'list':  return cmdList();
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      return cmdHelp();
    default:
      errLog(`unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
})().catch((e) => {
  errLog('unhandled:', e && e.stack ? e.stack : e);
  process.exit(2);
});
