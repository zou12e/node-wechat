const express = require('express');
const router = express.Router();
const rp = require('request-promise');
const logger = require('../../middleware/logger');
// const redisHelper = require('../../middleware/redis');
const xml = require('../../middleware/xml');
const WXCrypt = require('../../middleware/WXBizMsgCrypt');
const wechatHelper = require('../../server/helper');
const config = require('config');
const appID = config.wechat.appID;
const token = config.wechat.token;
const encodingAESKey = config.wechat.encodingAESKey;

router.get(['/', '/index'], async function (req, res) {
    const preAuthCode = await wechatHelper.getPreAuthCode();
    const url = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${appID}&pre_auth_code=${preAuthCode}&redirect_uri=http://dkfjdkj223qixiaolong.followme.com/wechat/success`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(`<meta charset="utf-8"><a href='${url}' >这里是授权页连接</a>`);
    res.end();
});

router.post('/:appid/callback', async function (req, res) {
    const appid = req.params.appid;
    logger.infos(`wechat callback-appid : ${req.params.appid}`);
    logger.infos(`wechat callback-appid-query: ${req.query && JSON.stringify(req.query)}`);
    logger.infos(`wechat callback-appid-body: ${req.query && JSON.stringify(req.body)}`);
    let xmlstr = '';
    req.on('data', function (chunk) {
        xmlstr += chunk;
    });
    req.on('end', async function () {
        logger.infos(`wechat callback-appid-xml: ${xmlstr}`);
        // 测试公众号消息回复
        if (appid === 'wx61a031ef51491ffc') {
            const xmlObj = await xml.xml2obj(xmlstr);
            if (xmlObj && xmlObj.xml && xmlObj.xml.Encrypt) {
                const wxcrypt = new WXCrypt(appID, token, encodingAESKey);
                const obj = await wxcrypt.decryptMsg(req.query.msg_signature, req.query.timestamp, req.query.nonce, xmlObj.xml);
                const toUser = obj.xml.FromUserName;
                const fromUser = obj.xml.ToUserName;
                const createTime = parseInt(new Date().getTime() / 1000);
                const msgType = 'text';
                const content = '谢谢留言！';
                const sendXmlstr = `<xml><ToUserName><![CDATA[${toUser}]]></ToUserName><FromUserName><![CDATA[${fromUser}]]></FromUserName><CreateTime>${createTime}</CreateTime><MsgType><![CDATA[${msgType}]]></MsgType><Content><![CDATA[${content}]]></Content></xml>`;
                const sendXml = wxcrypt.encryptMsg(sendXmlstr, {
                    nonce: req.query.nonce,
                    timestamp: req.query.timestamp
                });
                return res.end(sendXml);
            }
            return res.end('success');
        }
        res.end('success');
    });
});

router.get('/success', async function (req, res) {
    logger.infos(`wechat authorization_info: ${req.query && JSON.stringify(req.query)}`);
    if (req.query && req.query.auth_code && req.query.expires_in) {
        wechatHelper.setAuthorizationCode(req.query.auth_code, req.query.expires_in);
        wechatHelper.setAuth(req.query.auth_code);
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<meta charset="utf-8">授权成功');
    res.end();
});

router.post('/callback', function (req, res) {
    logger.infos(`wechat callback-query: ${req.query && JSON.stringify(req.query)}`);
    logger.infos(`wechat callback-body: ${req.query && JSON.stringify(req.body)}`);
    let xmlstr = '';
    req.on('data', function (chunk) {
        xmlstr += chunk;
    });
    req.on('end', async function () {
        logger.infos(`wechat callback-xml: ${xmlstr}`);
        await wechatHelper.setTicket(xmlstr);
    });
    res.end('success');
});

router.get('/send/msg', async function (req, res) {
    const appid = '';
    const toUser = 'ouNQoxEW6lCEWd6Sj02EhmvH7JaM';
    const auth = await wechatHelper.getAuth(appid);
    const authorizerAccessToken = auth.authorizer_access_token;
    const options = {
        uri: `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${authorizerAccessToken}`,
        headers: {
            'content-type': 'application/json'
        },
        method: 'POST',
        body: {
            'touser': toUser,
            'msgtype': 'text',
            'text':
                {
                    'content': '你好！'
                }
        },
        json: true
    };
    const data = await rp(options);
    console.log(data);
    res.end('success');
});

router.get('/test', async function (req, res) {
    res.end('success');
});

module.exports = router;
