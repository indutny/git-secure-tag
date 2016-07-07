'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const spawn = require('child_process').spawn;
const Buffer = require('buffer').Buffer;

const async = require('async');

const gst = require('../git-secure-tag');

function Hash(options) {
  this.options = options || {};
  this.cwd = null;
}
module.exports = Hash;

function compareEntries(a, b) {
  return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
}

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

Hash.prototype.hashSubmodule = function hashSubmodule(dir, ref, callback) {
  const hash = new Hash(this.options);
  hash._calculate(ref, dir, path.join(this.cwd, dir), callback);
};

Hash.prototype.flattenTree = function flattenTree(batch, dir, tree, callback) {
  const stream = batch.query(tree);

  let content = [];
  stream.on('data', chunk => content.push(chunk));
  stream.on('error', err => callback(err));

  const recurse = (entry, callback) => {
    const fullPath = dir === '' ? entry.name : dir + '/' + entry.name;

    function next(err, content) {
      entry.content = content;
      callback(err, entry);
    }

    if (entry.mode === '40000') {
      return this.flattenTree(batch, fullPath, entry.hash, next);
    } else if (entry.mode === '160000') {
      return this.hashSubmodule(fullPath, entry.hash, next);
    }

    return this.hashBlob(batch, entry.hash, next);
  };

  stream.on('end', () => {
    content = Buffer.concat(content);
    content = gst.common.parseTree(content);
    content.sort(compareEntries);

    async.map(content, recurse, callback);
  });
};

Hash.prototype.digest = function digest(hash, line) {
  hash.update(line + '\n');
  if (this.options.verbose)
    console.error(line);
};

Hash.prototype.hashTree = function hashTree(tree, digest) {
  tree.forEach((entry) => {
    const line = entry.mode + ' ' + entry.name + ' ' + entry.hash;
    if (Array.isArray(entry.content)) {
      this.digest(digest, line + ' ' + entry.content.length);
      this.hashTree(entry.content, digest);
    } else {
      this.digest(digest, line + ' ' + entry.content);
    }
  });
};

Hash.prototype.getTree = function getTree(batch, ref, callback) {
  const stream = batch.query(ref);

  stream.on('header', (type, size) => {
    let content = '';
    stream.on('data', chunk => content += chunk);
    stream.once('end', () => {
      if (type === 'tag') {
        const match = content.match(/(?:^|[\r\n])object ([a-z0-9]{40})/);
        assert(match !== null, 'Tag without `object`');
        return this.getTree(batch, match[1], callback);
      }
      assert.equal(type, 'commit');

      const match = content.match(/(?:^|[\r\n])tree ([a-z0-9]{40})/);
      assert(match !== null, 'Commit without `tree`');
      return callback(null, match[1]);
    });
  });
};

Hash.prototype._calculate = function _calculate(hash, relative, dir, callback) {
  const digest = crypto.createHash('sha512');
  const batch = new gst.Batch(dir);

  this.cwd = dir;

  // `update-index`?
  async.waterfall([
    (callback) => {
      this.getTree(batch, hash || 'HEAD', callback);
    },
    (hash, callback) => {
      this.flattenTree(batch, relative, hash,
                       (err, tree) => callback(err, tree, hash));
    }
  ], (err, tree, hash) => {
    if (err)
      return callback(err);

    batch.destroy();
    this.digest(digest, 'write-tree ' + hash + ' ' + tree.length);
    this.hashTree(tree, digest);
    callback(null, digest.digest('hex'));
  });
};

Hash.prototype.calculate = function calculate(dir, hash, callback) {
  this._calculate(hash, '', dir, callback);
};
