'use strict';

const async = require('async');
const tape = require('tape');

const gst = require('../');

const fixtures = require('./fixtures');

tape('js api', (t) => {
  fixtures.init();

  // Verify tags
  const api = new gst.API(fixtures.repo);

  const tags = [
    { name: 'tag-latest', ref: 'HEAD' },
    { name: 'tag-middle', ref: 'HEAD^' },
    { name: 'tag-first', ref: 'HEAD^^', legacy: true }
  ];

  async.waterfall([
    (callback) => {
      async.forEachSeries(tags, (tag, callback) => {
        api.sign(tag.name, tag.ref, { legacy: tag.legacy, insecure: true },
                 callback);
      }, callback);
    },
    (callback) => {
      async.mapSeries(tags, (tag, callback) => {
        api.verify(tag.name, { insecure: true }, callback);
      }, callback);
    },
    (results, callback) => {
      t.deepEqual(results, [ true, true, true ], 'sign results');

      const invalidTags = [ 'invalid-1', 'invalid-2', 'invalid-3' ];
      async.mapSeries(invalidTags, (tag, callback) => {
        api.verify(tag, { insecure: true }, (err, result) => {
          callback(null, { err: err, result: result });
        });
      }, callback);
    },
    (results, callback) => {
      t.ok(/EVTag.*mismatch/.test(results[0].err.message),
           'invalid #1');
      t.ok(/Secure-Tag.*mismatch/.test(results[1].err.message), 'invalid #2');
      t.ok(/No.*found/.test(results[2].err.message), 'invalid #3');
      t.ok(!results[0].result, 'invalid #1 result');
      t.ok(!results[1].result, 'invalid #2 result');
      t.ok(!results[2].result, 'invalid #3 result');

      callback(null);
    }
  ], (err) => {
    fixtures.destroy();
    t.end(err);
  });
});
