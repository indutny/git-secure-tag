# git-secure-tag
[![NPM version](https://badge.fury.io/js/git-secure-tag.svg)](http://badge.fury.io/js/git-secure-tag)
[![Build Status](https://secure.travis-ci.org/indutny/git-secure-tag.svg)](http://travis-ci.org/indutny/git-secure-tag)

## Why?

`git` uses SHA-1 hashes when signing tag. SHA-1 is generally deprecated and is
not a collision-safe anymore (though, ~~collisions are yet to come~~ pre-image attack is yet to come).

## How?

`git-secure-tag` runs `cat-file` recursively for each
entry (sorted alphabetically), enters submodules (if present), and hashes
file/directory names, file contents, and submodules (recursively again) into a
resulting `Git-EVTag-v0-SHA512: ...` SHA512 digest.

## Installation

```bash
npm install -g git-secure-tag
```

## Usage

```bash
# Sign
git secure-tag v1.2.7 -m "My tag annotation"

# Verify
git secure-tag -v v1.2.7
```

## Original evtag implementation

Largely inspired by:

https://github.com/cgwalters/git-evtag

## LICENSE

This software is licensed under the MIT License.

Copyright Fedor Indutny, 2016.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.
