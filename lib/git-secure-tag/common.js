'use strict';

function parseTree(buf) {
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
      mode: parts[0],
      name: parts[1],
      hash: hash
    });
  }
  return entries;
}
exports.parseTree = parseTree;
