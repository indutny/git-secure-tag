'use strict';

const stream = require('stream');
const spawn = require('child_process').spawn;

const gst = require('../git-secure-tag');

function Batch(dir) {
  this.dir = dir;
  // TODO(indutny): symlinks?
  this.proc = spawn(gst.GIT, [ 'cat-file', '--batch' ], {
    stdio: [ 'pipe', 'pipe', null ],
    cwd: this.dir
  });

  this.proc.on('exit', code => this.onExit(code));
  this.proc.stdout.on('data', data => this.onData(data));

  this.queue = [];
  this.state = 'header';
  this.header = '';
  this.body = null;
}
module.exports = Batch;

Batch.prototype.destroy = function destroy() {
  this.proc.kill();
};

Batch.prototype.onExit = function onExit(code) {
  const err = new Error(`git cat-file --batch (cwd: ${this.dir}) exit ${code}`);

  const q = this.queue;
  this.queue = null;
  q.forEach((entry) => {
    entry.stream.emit('error', err);
  });
};

Batch.prototype.onData = function onData(data) {
  while (data.length !== 0) {
    if (this.state === 'header') {
      let i;
      for (i = 0; i < data.length; i++)
        if (data[i] === 0x0a /* '\n' */)
          break;
      this.header += data.slice(0, i);

      if (i === data.length)
        break;

      // Skip '\n'
      data = data.slice(i + 1);
      const header = this.header;
      this.header = '';
      this.onHeader(header);
      continue;
    } else if (this.state === 'body' && data.length !== 0) {
      data = this.onBody(data);
      continue;
    } else if (this.state === 'body-end' && data.length !== 0) {
      // Skip '\n'
      data = data.slice(1);
      this.state = 'header';
      continue;
    }
  }
};

Batch.prototype.onHeader = function onHeader(header) {
  const parts = header.split(/\s/g);
  if (parts[1] === 'missing')
    this.onMissing(parts[0]);
  else if (/^[a-z0-9]{40}$/.test(parts[0]))
    this.onEntry(parts[0], parts[1], parts[2]);
  else
    throw new Error(`Unexpected header ${header}`);
};

Batch.prototype.getEntry = function getEntry(object) {
  const entry = this.queue[0];
  if (!entry)
    throw new Error(`Unexpected reply for ${object}`);

  return entry;
};

Batch.prototype.onMissing = function onMissing(object) {
  const entry = this.getEntry(object);
  this.queue.shift();
  entry.stream.emit('error', new Error('missing ' + object));
};

Batch.prototype.onEntry = function onEntry(object, type, size) {
  const entry = this.getEntry(object);

  entry.stream.emit('header', type, size);

  this.state = 'body';
  // floats store 52 bits of integer precision
  this.waiting = parseFloat(size);
};

Batch.prototype.onBody = function onBody(chunk) {
  const entry = this.queue[0];

  const rest = chunk.slice(this.waiting);
  entry.stream.push(chunk.slice(0, this.waiting));
  this.waiting -= chunk.length;
  if (this.waiting > 0)
    return rest;

  this.state = 'body-end';
  this.waiting = 0;
  this.queue.shift();
  entry.stream.push(null);

  return rest;
};

Batch.prototype.query = function query(object) {
  const out = new stream.PassThrough();
  this.queue.push({ object: object, stream: out });

  this.proc.stdin.write(object + '\n');

  return out;
};
