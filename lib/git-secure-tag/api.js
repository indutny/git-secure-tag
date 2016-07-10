'use strict';

const spawn = require('child_process').spawn;

const async = require('async');

const gst = require('../git-secure-tag');

function API(dir) {
  this.dir = dir;
}
module.exports = API;

const TAG_RE =
  /(?:[\r\n]|^)Git-(EVTag-v0-SHA512|Secure-Tag-V0)\s*:\s*([^\r\n]*)([\r\n]|$)/i;

function buffer(stream) {
  let chunks = '';
  let done = false;

  stream.on('data', chunk => chunks += chunk);
  stream.on('end', () => done = true);

  return (callback) => {
    if (done)
      return callback(null, chunks);
    else
      stream.once('end', () => callback(null, chunks));
  };
}

function git(args, stdio, cwd, env, callback) {
  const p = spawn(gst.GIT, args, {
    stdio: stdio,
    cwd: cwd,
    env: env
  });

  const stdout = p.stdout ? buffer(p.stdout) : (cb) => cb(null, null);
  const stderr = p.stderr ? buffer(p.stderr) : (cb) => cb(null, null);

  async.parallel({
    status: (callback) => {
      p.on('exit', (status) => callback(null, status));
    },
    stdout: stdout,
    stderr: stderr
  }, callback);
}

API.prototype.verify = function verify(tag, options, callback) {
  if (!options)
    options = {};

  const args = options.insecure ?
      [ 'show', tag ] : [ 'verify-tag', '-v', tag ];

  async.waterfall([
    (callback) => {
      git(args, [ 'inherit', 'pipe', 'pipe' ], this.dir, options.env, callback);
    },
    (p, callback) => {
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
      hash.calculate(this.dir, tag, (err, out) => callback(err, out, match, p));
    },
    (hash, match, p, callback) => {
      if (hash === match[2]) {
        callback(null, match[1], p.stderr.toString());
        return;
      }

      const msg = `error: Git-${match[1]} hash mismatch\n` +
                  `error: Expected: ${hash}\n` +
                  `error: Found: ${match[2]}`;
      callback(new Error(msg), false);
    }
  ], (err, type, stderr) => {
    if (err) {
      if (callback)
        return callback(err, false);

      process.stderr.write('error: ' + err.stack + '\n');
      process.exit(1);
      return;
    }

    if (callback)
      return callback(null, true);

    process.stderr.write(stderr);
    process.stderr.write(`Good Git-${type} hash\n`);
    process.exit(0);
  });
};

API.prototype.sign = function sign(tag, ref, options, callback) {
  // TODO(indutny): support multiple refs?
  if (!options)
    options = {};

  async.waterfall([
    (callback) => {
      const hash = new (options.legacy ? gst.LegacyHash : gst.Hash)(options);
      hash.calculate(this.dir, ref, callback);
    },
    (hash, callback) => {
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

      git(args, 'inherit', this.dir, options.env, callback);
    },
    (proc, callback) => {
      callback(proc.status === 0 ? null : new Error('git failure'));
    }
  ], (err) => {
    if (err) {
      if (callback)
        return callback(err);

      process.stderr.write(err.stack + '\n');
      process.exit(1);
      return;
    }

    if (callback)
      return callback(null);

    process.exit(0);
  });
};
