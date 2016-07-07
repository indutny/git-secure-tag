'use strict';

const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const rimraf = require('rimraf');

const gst = require('../../');
const GIT = gst.GIT;

const cli = path.join(__dirname, '..', '..', 'bin', 'git-secure-tag');
exports.cli = cli;

const repo = path.join(__dirname, 'repo');
exports.repo = repo;

function cmd(name, args, noCwd) {
  const p = spawnSync(name, args, {
    stdio: [ null, 'pipe', 'pipe' ],
    cwd: noCwd ? undefined : repo
  });
  if (p.status !== 0) {
    const msg = `${name} ${args.join(' ')} failed`;
    throw new Error(msg + '\n' + p.stdout + '\n' + p.stderr);
  }
}
exports.cmd = cmd;

function write(file, content) {
  fs.writeFileSync(path.join(repo, file), content);
}
exports.write = write;

// Initialize repo
exports.init = function init() {
  rimraf.sync(repo);
  fs.mkdirSync(repo);

  cmd(GIT, [ 'init' ]);
  cmd(GIT, [ 'config', 'user.email', 'john@doe.org' ]);
  cmd(GIT, [ 'config', 'user.name', 'John Doe' ]);
};

// Clone repo
exports.clone = function clone(url) {
  rimraf.sync(repo);
  cmd(GIT, [ 'clone', url, repo ], true);
};

exports.destroy = function destroy() {
  rimraf.sync(repo);
};
