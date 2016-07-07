'use strict';

const tape = require('tape');

const fixtures = require('./fixtures');

const cli = fixtures.cli;
const cmd = fixtures.cmd;

tape('evtag interop', (t) => {
  const repos = [
    'git://github.com/cgwalters/git-evtag.git',
    'git://github.com/ostreedev/ostree.git',
    'git://github.com/GNOME/gnome-terminal.git',
    'https://gitlab.com/fidencio/libosinfo.git'
  ];

  repos.forEach((url) => {
    fixtures.clone(url);

    const tags = fixtures.tags();

    // Verify tags
    const node = process.execPath;
    tags.forEach((tag) => {
      t.doesNotThrow(() => cmd(node, [ cli, '--insecure', '-v', tag ]),
                     `tag ${tag} of ${url} should validate`);
    });

    fixtures.destroy();
  });
  t.end();
});
