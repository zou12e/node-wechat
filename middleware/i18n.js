module.exports = (req, res, next) => {
    /**
     * 请求成功
     */
    res.success = function (data, msg) {
        res.status(200).json({ code: 1, data: data, msg: msg });
    };
    /**
     * 请求发生错误
     */
    res.error = function (err, msg) {
        res.status(200).json({ code: 0, data: err, msg: msg });
    };
    next();
};
