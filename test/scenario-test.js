'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const tape = require('tape');
const rimraf = require('rimraf');

const gst = require('../');
const GIT = gst.GIT;

const cli = path.join(__dirname, '..', 'bin', 'git-secure-tag');

const repo = path.join(__dirname, 'fixtures', 'scenario');

function cmd(name, args) {
  const p = spawnSync(name, args, {
    stdio: [ null, 'pipe', 'pipe' ],
    cwd: repo
  });
  if (p.status !== 0) {
    const msg = `${name} ${args.join(' ')} failed`;
    throw new Error(msg + '\n' + p.stdout + '\n' + p.stderr);
  }
}

function write(file, content) {
  fs.writeFileSync(path.join(repo, file), content);
}

tape('v8 inspect', (t) => {
  // Initialize repo
  // TODO(indutny): move it to fixtures?
  rimraf.sync(repo);
  fs.mkdirSync(repo);

  cmd(GIT, [ 'init' ]);

  write('file.txt', 'hello');
  cmd(GIT, [ 'add', 'file.txt' ]);
  cmd(GIT, [ 'commit', '-m', 'first' ]);

  write('file.txt', 'world');
  cmd(GIT, [ 'add', 'file.txt' ]);
  cmd(GIT, [ 'commit', '-m', 'second' ]);

  write('file.txt', '!');
  cmd(GIT, [ 'add', 'file.txt' ]);
  cmd(GIT, [ 'commit', '-m', 'third' ]);

  // Create tags
  const node = process.execPath;
  cmd(node, [ cli, '--insecure', 'tag-latest' ]);
  cmd(node, [ cli, '--insecure', 'tag-middle', 'HEAD^' ]);
  cmd(node, [ cli, '--insecure', '--legacy', 'tag-legacy', 'HEAD^^' ]);

  // Verify tags
  t.doesNotThrow(() => cmd(node, [ cli, '--insecure', '-v', 'tag-latest' ]),
                 'valid HEAD evtag');
  t.doesNotThrow(() => cmd(node, [ cli, '--insecure', '-v', 'tag-middle' ]),
                 'valid non-HEAD evtag');
  t.doesNotThrow(() => cmd(node, [ cli, '--insecure', '-v', 'tag-legacy' ]),
                 'valid legacy hash');

  // Fail to verify invalid tags
  const hash = crypto.createHash('sha512').update('invalid').digest('hex');
  cmd(GIT, [ 'tag', '-m', `Git-EVTag-v0-SHA512: ${hash}`, 'invalid-1' ]);
  cmd(GIT, [ 'tag', '-m', `Git-Secure-Tag-v0: ${hash}`, 'invalid-2' ]);
  cmd(GIT, [ 'tag', '-m', `Random-Hash: ${hash}`, 'invalid-3' ]);

  t.throws(() => cmd(node, [ cli, '--insecure', '-v', 'invalid-1' ]),
           /EVTag.*mismatch/,
           'invalid evtag hash');
  t.throws(() => cmd(node, [ cli, '--insecure', '-v', 'invalid-2' ]),
           /Secure-Tag.*mismatch/,
           'invalid legacy hash');
  t.throws(() => cmd(node, [ cli, '--insecure', '-v', 'invalid-3' ]),
           /No.*found/,
           'no hash at all');

  // Deinitialize repo
  rimraf.sync(repo);
  t.end();
});
