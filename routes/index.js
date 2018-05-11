
const _route = '/wechat';
const commonRouter = require('./common');
module.exports = function (app) {
    app.use(_route, commonRouter);
};
