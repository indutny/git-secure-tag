'use strict';

const path = require('path');
const crypto = require('crypto');
const spawn = require('child_process').spawn;
const Buffer = require('buffer').Buffer;

const async = require('async');

const gst = require('../git-secure-tag');

function Hash() {
  this.cwd = null;
}
module.exports = Hash;

Hash.prototype.git = function git(args, cwd, callback) {
  const p = spawn(gst.GIT, args, {
    stdio: [ 'inherit', 'pipe', null ],
    cwd: cwd
  });

  let data = '';
  p.stdout.on('data', chunk => data += chunk);

  async.parallel([
    callback => p.stdout.on('end', callback),
    (callback) => {
      p.on('exit', (code) => {
        if (code === 0)
          return callback(null);

        const err = new Error(`git ${args.join(' ')} (cwd: ${cwd}) failed ` +
                              `with ${code} exit code`);
        callback(err);
      })
    }
  ], (err) => {
    callback(err, data);
  });
};

function compareEntries(a, b) {
  return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
}

Hash.prototype.parseTree = function parseTree(buf) {
  let off = 0;
  let entries = [];
  while (off < buf.length) {
    let i;
    for (i = off; i < buf.length; i++)
      if (buf[i] === 0x00)
        break;
    if (i + 1 >= buf.length)
      throw new Error('Tree entry\'s name not found');

    const name = buf.slice(off, i).toString();
    off = i + 1;

    if (off + 20 > buf.length)
      throw new Error('Not enough space for tree entry\'s hash');

    const hash = buf.slice(off, off + 20).toString('hex');
    off += 20;

    const parts = name.split(' ');
    entries.push({
      perm: parts[0],
      name: parts[1],
      hash: hash,
      fullPath: null,
      content: null
    });
  }
  entries.sort(compareEntries);
  return entries;
};

Hash.prototype.hashBlob = function hashBlob(batch, blob, callback) {
  const hash = crypto.createHash('sha512');

  const stream = batch.query(blob);

  stream.pipe(hash);
  stream.on('error', err => callback(err));

  let content = [];
  hash.on('data', chunk => content.push(chunk));
  hash.on('end', () => {
    content = Buffer.concat(content);
    callback(null, content.toString('hex'));
  });
};

Hash.prototype.hashSubmodule = function hashSubmodule(dir, callback) {
  const hash = new Hash();
  hash._calculate(dir, path.join(this.cwd, dir), callback);
};

Hash.prototype.flattenTree = function flattenTree(batch, dir, tree, callback) {
  const stream = batch.query(tree);

  let content = [];
  stream.on('data', chunk => content.push(chunk));
  stream.on('error', err => callback(err));

  const recurse = (entry, callback) => {
    const fullPath = dir === '' ? entry.name : dir + '/' + entry.name;

    function next(err, content) {
      entry.fullPath = fullPath;
      entry.content = content;
      callback(err, entry);
    }

    if (entry.perm === '40000') {
      return this.flattenTree(batch, fullPath, entry.hash, next);
    } else if (entry.perm === '160000') {
      return this.hashSubmodule(fullPath, next);
    }

    return this.hashBlob(batch, entry.hash, next);
  };

  stream.on('end', () => {
    content = Buffer.concat(content);
    content = this.parseTree(content);

    async.map(content, recurse, callback);
  });
};

Hash.prototype.hashTree = function hashTree(tree, digest) {
  tree.forEach((entry) => {
    digest.update(entry.perm + ' ' + entry.fullPath + ' ' + entry.hash + '\n');
    if (Array.isArray(entry.content)) {
      digest.write(entry.content.length + '\n');
      this.hashTree(entry.content, digest);
    } else {
      digest.update(entry.content + '\n');
    }
  });
};

Hash.prototype._calculate = function _calculate(relative, dir, callback) {
  const digest = crypto.createHash('sha512');
  const batch = new gst.Batch(dir);

  this.cwd = dir;

  // `update-index`?
  async.waterfall([
    (callback) => {
      this.git([ 'write-tree' ], dir, callback);
    },
    (hash, callback) => {
      hash = hash.trim();

      digest.update(hash + '\n');
      this.flattenTree(batch, relative, hash, callback);
    }
  ], (err, tree) => {
    if (err)
      return callback(err);

    batch.destroy();
    this.hashTree(tree, digest);
    callback(null, digest.digest('hex'));
  });
};

Hash.prototype.calculate = function calculate(dir, callback) {
  this._calculate('', dir, callback);
};
