# git-secure-tag
[![NPM version](https://badge.fury.io/js/git-secure-tag.svg)](http://badge.fury.io/js/git-secure-tag)

## Why?

`git` uses SHA-1 hashes when signing tag. SHA-1 is generally deprecated and is
not a collision-safe anymore (though, collisions are yet to come).

## How?

`git-secure-tag` runs `write-tree` and then `cat-file` recursively for each
entry (sorted alphabetically), enters submodules (if present), and hashes
file/directory names, SHA-512 digests of file contents, and SHA-512 digests of
submodules (recursively again) into a resulting `Git-Secure-Tag-V0: ...`.

`git secure-tag hash --verbose` may be run to observe digest contents:

```
write-tree 27e35e69520a52ac3585a41356b1933d2e312926 4
100644 .gitignore 1ca957177f035203810612d1d93a66b08caff296 729aa622892420092047259f95a71d5d6b1b3cab37cbebbdefb9c00458da2486fb2603faff8809faedf610e6f07f69850b1bd50067b68ce1dfdf8c5eda17180b
40000 bin a053e6719c5ae6a3fb00512d9c2665b8befe5aa5 1
100755 git-secure-tag 20b96cc2be29a06591ef54ab3ba3d3892487c01b b58f11bdf691e5659e38b76e43ba8221b9164879b5b5cf4504c3b4ae74c0691233c0602ab7064c53209b0aab7c7ae0309fb51229224fde3256556d6d381edba7
40000 lib 8b6059d53fe98058c562c0d4103c26dbbac0fcb6 2
40000 git-secure-tag 5074554be7b49d39f5a66e84d5e5092bcceeb66e 3
100644 batch.js b157403ad2cf71c7e3de590dbba6b4233571bbd5 6ce1a8a913686f6b3f1624cf1e1807f7835c36a243a222a559c91c20f8723f8bf6018d83906f01c48148d1ddebb5df869fc6c41d3a6d27bc8580146449fa4d26
100644 hash.js 21c068754488ba759b1ea907459d41136a3cfcf0 cabd614aa7a3e08c2c68517c09c57a58b4fd98e7dc1d0dfba2f29ab989d2f3f164c4a3c1bcedb14860978c1e37479017433d3166275dc08830ad37e3e219840d
100644 tag.js cca62e2c4fd8fc3f9cd8bb86731e53702a609fad d803ff14ab030dbd0b2c7ebb85e7c9da5fae77cd711e4dfc77238f9a78fa697c61539dc90b18647e0559fb14d071729c7a31aecbb149be4592c2a5ab2593b661
100644 git-secure-tag.js 7638d3ec573b754c435905dc2ac41f5ebf1119bf cd444ebe948cbab0b43f80e22a6e72782d3769b653ed5063fb9b24a1067d496b674f8b938ed0164be0474ecb3334e5e770121e45e6d51e018988076712c29714
100644 package.json 6f4fab0273ac5924137ef4a1c7ad55eab4444e66 7082d15391dfff640050203f3d8ee522b6b86d588be616520ad00ccd0b9b61355d1ad03f09cec0b915789699c96f62ff00c6fe5315af50c52706449b571f73ae
5c4c88490d7b9625bcfbe7c02ac60c20cd61fa7d3b64c11c572dfc61b9e2b22332277065a4b6c8d9e5785e9e53f6fa1c2d20d5b1577eb518b84a0df3a61ff2e3
```

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
