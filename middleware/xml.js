const parseString = require('xml2js').parseString;

const xml = {
    async xml2obj (xmlstr) {
        return new Promise(function (resolve, reject) {
            if (!xmlstr) return resolve(null);
            parseString(xmlstr, { explicitArray: false }, function (err, result) {
                if (err) {
                    return resolve(null);
                }
                resolve(result);
            });
        });
    }
};
module.exports = xml;
