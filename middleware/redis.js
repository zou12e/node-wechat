const config = require('config');
const redis = require('redis');
const logger = require('./logger');
const redisClient = redis.createClient(config.get('redis'));

redisClient.on('connect', function () {
    logger.infos('redis db not 0 connect success');
});
redisClient.on('error', function (err) {
    logger.infos('redis db not 0 connect fail', err);
});
redisClient.getVal = function (key) {
    return new Promise((resolve, reject) => {
        redisClient.get(key, function (err, reply) {
            if (err) {
                return reject(err);
            }
            resolve(reply);
        });
    });
};
redisClient.setExpire = (key, value, time) => {
    const expiry = time || 30 * 60 * 1000;
    // px表示毫秒 expiry默认时间30分钟
    redisClient.set(key, value, 'PX', expiry);
};
module.exports = redisClient;
