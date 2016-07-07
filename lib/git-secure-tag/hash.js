'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const Buffer = require('buffer').Buffer;

const async = require('async');

const gst = require('../git-secure-tag');

function Hash(options) {
  this.options = options || {};
}
module.exports = Hash;

function State(digest, root, dir, batch) {
  this.digest = digest;
  this.root = root;
  this.dir = dir;
  this.batch = batch;
}

State.prototype.query = function query(hash) {
  return this.batch.query(hash);
};

State.prototype.update = function update(data) {
  this.digest.update(data);
};

State.prototype.enter = function enter(part) {
  const subdir = this.dir === '' ? part : this.dir + '/' + part;
  return new State(this.digest, this.root, subdir, this.batch);
};

Hash.prototype._visit = function _visit(state, hash, callback) {
  const stream = state.query(hash);

  stream.on('header', (type, size) => {
    if (type !== 'tag')
      state.update(type + ' ' + size +'\0');

    const chunks = [];
    stream.on('data', (data) => {
      if (type !== 'tag')
        state.update(data);

      if (type === 'blob')
        return;

      chunks.push(data);
    });

    stream.on('end', () => {
      if (type === 'blob')
        return callback(null);

      const content = Buffer.concat(chunks);

      if (type === 'tree')
        this._visitTree(state, content, callback);
      else if (type === 'commit')
        this._visitCommit(state, content, callback);
      else if (type === 'tag')
        this._visitTag(state, content, callback);
      else
        throw new Error(`Unexpected type ${type}`);
    });
  });

  stream.on('error', (err) => callback(err));
};

Hash.prototype._visitTree = function _visitTree(state, content, callback) {
  const tree = gst.common.parseTree(content);

  async.forEachSeries(tree, (node, callback) => {
    const subState = state.enter(node.name);

    if (node.mode === '160000')
      return this._visitSubmodule(subState, node.hash, callback);

    this._visit(subState, node.hash, callback);
  }, callback);
};

Hash.prototype._visitCommit = function _visitCommit(state, content, callback) {
  content = content.toString();

  // Root commit
  assert.equal(state.dir, '', 'Unexpected commit in a tree!');

  const match = content.match(/(?:^|[\r\n])tree ([a-z0-9]{40})/);
  assert(match !== null, 'Commit without `tree`');

  this._visit(state, match[1], callback);
};

Hash.prototype._visitTag = function _visitTag(state, content, callback) {
  content = content.toString();
  const match = content.match(/(?:^|[\r\n])object ([a-z0-9]{40})/);
  assert(match !== null, 'Tag without `object`');

  this._visit(state, match[1], callback);
};

Hash.prototype._visitSubmodule = function _visitSubmodule(state, hash,
                                                          callback) {
  // TODO(indutny): windows-style paths?
  const moduleRoot = path.join(state.root, state.dir);
  const batch = new gst.Batch(moduleRoot);
  const moduleState = new State(state.digest, moduleRoot, '', batch);

  this._visit(moduleState, hash, (err) => {
    batch.destroy();
    callback(err);
  });
};

Hash.prototype.calculate = function calculate(dir, hash, callback) {
  const digest = crypto.createHash('sha512');
  const batch = new gst.Batch(dir);
  const state = new State(digest, dir, '', batch);

  this._visit(state, hash || 'HEAD', (err) => {
    batch.destroy();

    if (err)
      return callback(err);

    callback(null, digest.digest('hex'));
  });
};
