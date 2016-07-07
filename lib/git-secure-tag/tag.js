'use strict';

const spawnSync = require('child_process').spawnSync;

const gst = require('../git-secure-tag');

function Tag(options, dir) {
  this.options = options || {};
  this.dir = dir;
}
module.exports = Tag;

const TAG_RE =
  /(?:[\r\n]|^)Git-(EVTag-v0-SHA512|Secure-Tag-V0)\s*:\s*([^\r\n]*)([\r\n]|$)/i;

Tag.prototype.verify = function verify(callback) {
  const p = spawnSync(gst.GIT, [ 'verify-tag', '-v', this.options._[0] ], {
    stdio: [ 'inherit', 'pipe', null ]
  });

  if (p.status !== 0) {
    if (callback)
      return callback(new Error(p.stderr.toString()));

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
      return callback(new Error(msg));

    process.stderr.write(msg + '\n');
    process.exit(1);
    return;
  }

  const isLegacy = match[1].toLowerCase() === 'secure-tag-v0';

  const hash = new (isLegacy ? gst.LegacyHash : gst.Hash)(this.options);
  hash.calculate(this.dir, this.options._[0], (err, hash) => {
    if (err) {
      if (callback)
        return callback(err);

      process.stderr.write('error: ' + err.stack + '\n');
      process.exit(1);
      return;
    }

    if (hash === match[2]) {
      if (callback)
        return callback(null, p.stderr.toString());

      process.stderr.write(p.stderr.toString());
      process.stderr.write(`Good Git-${match[1]} hash\n`);
      process.exit(0);
      return;
    }

    const msg = `error: Git-${match[1]} hash mismatch\n` +
                `error: Expected: ${hash}\n` +
                `error: Found: ${match[2]}`;
    if (callback)
      return callback(msg);

    process.stderr.write(msg + '\n');
    process.exit(1);
  });
};

Tag.prototype.sign = function sign() {
  const hash = new gst.Hash(this.options);
  hash.calculate(this.dir, this.options._[1], (err, hash) => {
    if (err) {
      process.stderr.write(err.stack + '\n');
      process.exit(1);
      return;
    }

    const msg = (this.options.m || (this.options._[0] + '\n')) + '\n' +
                'Git-EVTag-v0-SHA512: ' + hash;

    let args = [ 'tag' ];
    args.push('-m', msg);
    if (this.options.u)
      args.push('-u', this.options.u);
    else
      args.push('-s');
    if (this.options.f)
      args.push('-f');
    args = args.concat(this.options._);

    const p = spawnSync(gst.GIT, args, { cwd: this.dir, stdio: 'inherit' });
    process.exit(p.status);
  });
};
