const path = require('path');

const moment = require('moment');
const winston = require('winston'); // v2.x required
const WinstonDailyRotateFile = require('winston-daily-rotate-file'); // v2.0.0-beta required
const env = require('config').get('env');

// normal-YYYY-MM-DD.log
const log = new winston.Logger({
    transports: [
        new WinstonDailyRotateFile({
            // %DATE% 表达式在 winston-daily-rotate-file@2.0.0-beta 之后版本才支持
            filename: path.join(__dirname, '../logs/%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            prepend: true,
            json: false,
            formatter: options => {
                const { level, message, meta } = options;
                return JSON.stringify({
                    time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
                    level,
                    msg: { message, meta }
                });
            }
        })
    ]
});
log.infos = function (...msg) {
    if (env === 'dev') {
        console.log(msg);
    } else {
        log.info(msg);
    }
};
log.errors = function (...msg) {
    if (env === 'dev') {
        console.error(msg);
    }
    log.error(msg);
};
module.exports = log;
