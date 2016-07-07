'use strict';

const crypto = require('crypto');

const tape = require('tape');

const gst = require('../');

const fixtures = require('./fixtures');

const cli = fixtures.cli;
const cmd = fixtures.cmd;

tape('git secure tag', (t) => {
  fixtures.init();

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
