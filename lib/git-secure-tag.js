'use strict';

const GIT = process.env.GIT_SSH_COMMAND || process.env.GIT_SSH ||
            process.env.GIT_EXEC_PATH || 'git';

exports.GIT = GIT;
exports.Batch = require('./git-secure-tag/batch');
exports.Hash = require('./git-secure-tag/hash');
exports.Tag = require('./git-secure-tag/tag');
