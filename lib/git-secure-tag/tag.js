'use strict';

const spawnSync = require('child_process').spawnSync;

const gst = require('../git-secure-tag');

function Tag(options, dir) {
  this.options = options || {};
  this.dir = dir;
}
module.exports = Tag;

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

  const match = p.stdout.toString().match(
      /(?:[\r\n]|^)Git-Secure-Tag-V0\s*:\s*([^\r\n]*)(?:[\r\n]|$)/i);
  if (match === null) {
    const msg = 'error: No `Git-Secure-Tag-V0: ...` found in tag description';
    if (callback)
      return callback(new Error(msg));

    process.stderr.write(msg + '\n');
    process.exit(1);
    return;
  }

  const hash = new gst.Hash(this.options);
  hash.calculate(this.dir, (err, hash) => {
    if (err) {
      if (callback)
        return callback(err);

      process.stderr.write('error: ' + err.stack + '\n');
      process.exit(1);
      return;
    }

    if (hash === match[1]) {
      if (callback)
        return callback(null, p.stderr.toString());

      process.stderr.write(p.stderr.toString());
      process.stderr.write('Good Git-Secure-Tag hash\n');
      process.exit(0);
      return;
    }

    const msg = 'error: Git-Secure-Tag hash mismatch\n' +
                `error: Expected: ${hash}\n` +
                `error: Found: ${match[1]}`;
    if (callback)
      return callback(msg);

    process.stderr.write(msg + '\n');
    process.exit(1);
  });
};

Tag.prototype.sign = function sign() {
  const hash = new gst.Hash(this.options);
  hash.calculate(this.dir, (err, hash) => {
    if (err) {
      process.stderr.write(err.stack + '\n');
      process.exit(1);
      return;
    }

    const msg = (this.options.m || this.options._[0]) + '\n' +
                'Git-Secure-Tag-V0: ' + hash;

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
