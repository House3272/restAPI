var redis = require('ioredis')({
  port: 6379,
  host: '127.0.0.1',
  db: 0
});
exports.redis = redis;