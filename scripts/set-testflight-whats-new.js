#!/usr/bin/env node
/**
 * set-testflight-whats-new.js
 *
 * Reads the English release notes from whatsnew/whatsnew-en-US and pushes them
 * to the exact TestFlight build that was just uploaded, identified by its build
 * number and app version extracted from the IPA before upload.
 *
 * Required environment variables:
 *   ASC_API_KEY_BASE64  – base64-encoded .p8 private key
 *   ASC_API_KEY_ID      – key ID from App Store Connect → Users & Access → Keys
 *   ASC_ISSUER_ID       – issuer UUID from the same page
 *   ASC_APP_ID          – numeric App Store app ID (App Store Connect → App Information)
 *   IPA_BUILD_NUMBER    – CFBundleVersion from the built IPA (e.g. "42")
 *   IPA_APP_VERSION     – CFBundleShortVersionString from the built IPA (e.g. "1.2.3")
 *   CHANGELOG_FILE      – path to the changelog file (default: whatsnew/whatsnew-en-US)
 */

import crypto from 'crypto';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEY_BASE64 = process.env.ASC_API_KEY_BASE64;
const KEY_ID = process.env.ASC_API_KEY_ID;
const ISSUER_ID = process.env.ASC_ISSUER_ID;
const APP_ID = process.env.ASC_APP_ID;
const BUILD_NUMBER = process.env.IPA_BUILD_NUMBER;
const APP_VERSION = process.env.IPA_APP_VERSION;
const CHANGELOG_FILE = process.env.CHANGELOG_FILE || 'whatsnew/whatsnew-en-US';

const LOCALE = 'en-US';
const ASC_BASE = 'api.appstoreconnect.apple.com';
const POLL_INTERVAL_MS = Number(process.env.ASC_POLL_INTERVAL_SECONDS ?? 30) * 1000;
const MAX_ATTEMPTS = Number(process.env.ASC_MAX_POLL_ATTEMPTS ?? 20);

function makeJwt() {
  const privateKey = Buffer.from(KEY_BASE64, 'base64').toString('utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' }));
  const data = `${header}.${payload}`;
  const sig = crypto.createSign('SHA256').update(data).sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(sig)}`;
}

function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const token = makeJwt();
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: ASC_BASE,
      path: urlPath,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`ASC API ${method} ${urlPath} → ${res.statusCode}: ${data}`));
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function findExactBuildId() {
  const qs = [
    `filter[version]=${encodeURIComponent(BUILD_NUMBER)}`,
    `filter[preReleaseVersion.version]=${encodeURIComponent(APP_VERSION)}`,
    `filter[app]=${encodeURIComponent(APP_ID)}`,
    'limit=1',
  ].join('&');
  const res = await request('GET', `/v1/builds?${qs}`);
  const builds = res && res.data;
  if (!builds || builds.length === 0) return null;
  return builds[0].id;
}

async function getBetaLocalizationId(buildId) {
  const res = await request('GET', `/v1/builds/${buildId}/betaBuildLocalizations`);
  const locs = res && res.data;
  if (!locs) return null;
  const match = locs.find((l) => l.attributes.locale === LOCALE);
  return match ? match.id : null;
}

async function createBetaLocalization(buildId, whatsNew) {
  await request('POST', '/v1/betaBuildLocalizations', {
    data: {
      type: 'betaBuildLocalizations',
      attributes: { locale: LOCALE, whatsNew },
      relationships: { build: { data: { type: 'builds', id: buildId } } },
    },
  });
}

async function updateBetaLocalization(locId, whatsNew) {
  await request('PATCH', `/v1/betaBuildLocalizations/${locId}`, {
    data: {
      type: 'betaBuildLocalizations',
      id: locId,
      attributes: { whatsNew },
    },
  });
}

async function run() {
  const required = ['ASC_API_KEY_BASE64', 'ASC_API_KEY_ID', 'ASC_ISSUER_ID', 'ASC_APP_ID', 'IPA_BUILD_NUMBER', 'IPA_APP_VERSION'];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  const changelogPath = path.resolve(CHANGELOG_FILE);
  if (!fs.existsSync(changelogPath)) {
    console.error(`Changelog file not found: ${changelogPath}`);
    process.exit(1);
  }
  const whatsNew = fs.readFileSync(changelogPath, 'utf8').trim();
  console.log(`Changelog (${LOCALE}): ${whatsNew}`);
  console.log(`Targeting build: version=${APP_VERSION} buildNumber=${BUILD_NUMBER}`);

  let buildId = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Polling for build version=${APP_VERSION} build=${BUILD_NUMBER} (attempt ${attempt}/${MAX_ATTEMPTS})…`);
    buildId = await findExactBuildId().catch((err) => {
      console.warn(`Poll error: ${err.message}`);
      return null;
    });
    if (buildId) break;
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  if (!buildId) {
    console.error(
      `Build version=${APP_VERSION} build=${BUILD_NUMBER} not found in App Store Connect after ${MAX_ATTEMPTS} attempts. ` +
      `Ensure ASC_APP_ID is correct and that the build processed successfully.`
    );
    process.exit(1);
  }
  console.log(`Found build: ${buildId}`);

  const locId = await getBetaLocalizationId(buildId);
  if (locId) {
    console.log(`Updating existing localization ${locId}…`);
    await updateBetaLocalization(locId, whatsNew);
  } else {
    console.log('Creating new localization…');
    await createBetaLocalization(buildId, whatsNew);
  }
  console.log("TestFlight what's new text updated successfully.");
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
