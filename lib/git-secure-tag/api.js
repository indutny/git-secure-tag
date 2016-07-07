'use strict';

const spawnSync = require('child_process').spawnSync;

const gst = require('../git-secure-tag');

function API(dir) {
  this.dir = dir;
}
module.exports = API;

const TAG_RE =
  /(?:[\r\n]|^)Git-(EVTag-v0-SHA512|Secure-Tag-V0)\s*:\s*([^\r\n]*)([\r\n]|$)/i;

API.prototype.verify = function verify(tag, options, callback) {
  if (!options)
    options = {};

  const args = options.insecure ?
      [ 'show', tag ] : [ 'verify-tag', '-v', tag ];
  const p = spawnSync(gst.GIT, args, {
    stdio: [ 'inherit', 'pipe', 'pipe' ],
    cwd: this.dir
  });

  if (p.status !== 0) {
    if (callback)
      return callback(new Error(p.stderr.toString()), false);

    process.stdout.write(p.stdout.toString());
    process.stderr.write(p.stderr.toString());
    process.exit(1);
    return;
  }

  const stdout = p.stdout.toString();

  const match = stdout.match(TAG_RE);
  if (match === null) {
    const msg = 'error: No `Git-EVTag-v0-SHA512: ...`, nor ' +
                '`Git-Secure-Tag-V0` found in tag description';
    if (callback)
      return callback(new Error(msg), false);

    process.stderr.write(msg + '\n');
    process.exit(1);
    return;
  }

  const isLegacy = match[1].toLowerCase() === 'secure-tag-v0';

  const hash = new (isLegacy ? gst.LegacyHash : gst.Hash)(options);
  hash.calculate(this.dir, tag, (err, hash) => {
    if (err) {
      if (callback)
        return callback(err, false);

      process.stderr.write('error: ' + err.stack + '\n');
      process.exit(1);
      return;
    }

    if (hash === match[2]) {
      if (callback)
        return callback(null, true);

      process.stderr.write(p.stderr.toString());
      process.stderr.write(`Good Git-${match[1]} hash\n`);
      process.exit(0);
      return;
    }

    const msg = `error: Git-${match[1]} hash mismatch\n` +
                `error: Expected: ${hash}\n` +
                `error: Found: ${match[2]}`;
    if (callback)
      return callback(new Error(msg), false);

    process.stderr.write(msg + '\n');
    process.exit(1);
  });
};

API.prototype.sign = function sign(tag, ref, options, callback) {
  // TODO(indutny): support multiple refs?
  if (!options)
    options = {};

  const hash = new (options.legacy ? gst.LegacyHash : gst.Hash)(options);
  hash.calculate(this.dir, ref, (err, hash) => {
    if (err) {
      if (callback)
        return callback(null);

      process.stderr.write(err.stack + '\n');
      process.exit(1);
      return;
    }

    const name =
        options.legacy ? 'Git-Secure-Tag-V0' : 'Git-EVTag-v0-SHA512';
    const msg = (options.m || (tag + '\n')) + '\n' +
                `${name}: ${hash}\n`;

    let args = [ 'tag' ];
    args.push('-m', msg);
    if (options.u)
      args.push('-u', options.u);
    else if (!options.insecure)
      args.push('-s');
    if (options.f)
      args.push('-f');
    args.push(tag);
    if (ref !== undefined)
      args.push(ref);

    const p = spawnSync(gst.GIT, args, { cwd: this.dir, stdio: 'inherit' });
    if (callback)
      return callback(p.status === 0 ? null : new Error('git failure'));

    process.exit(p.status);
  });
};
