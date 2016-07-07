'use strict';

const crypto = require('crypto');

const tape = require('tape');

const gst = require('../');
const GIT = gst.GIT;

const fixtures = require('./fixtures');

const cli = fixtures.cli;
const cmd = fixtures.cmd;
const write = fixtures.write;

tape('git secure tag', (t) => {
  fixtures.init();

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

  fixtures.destroy();
  t.end();
});
