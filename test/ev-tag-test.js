'use strict';

const tape = require('tape');

const fixtures = require('./fixtures');

const cli = fixtures.cli;
const cmd = fixtures.cmd;

tape('evtag interop', (t) => {
  fixtures.clone('git://github.com/cgwalters/git-evtag.git');

  // Verify tags
  const node = process.execPath;
  t.doesNotThrow(() => cmd(node, [ cli, '--insecure', '-v', 'v2016.1' ]),
                 'valid evtag #1');
  t.doesNotThrow(() => cmd(node, [ cli, '--insecure', '-v', 'v2015.2' ]),
                 'valid evtag #2');

  fixtures.destroy();
  t.end();
});
