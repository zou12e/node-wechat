const rp = require('request-promise');
const redisHelper = require('../middleware/redis');
const WXCrypt = require('../middleware/WXBizMsgCrypt');
const xml = require('../middleware/xml');
const config = require('config');
const appID = config.wechat.appID;
const token = config.wechat.token;
const secret = config.wechat.secret;
const encodingAESKey = config.wechat.encodingAESKey;

const Helper = {
    /**
     * [推送component_verify_ticket协议]
     * 设置component_verify_ticket
     * 开通微信第三方平台后， 微信会每隔十分钟回调配置的服务器（授权事件接收URL）
     * @param {*} xmlstr
     */
    async setTicket (xmlstr) {
        const xmlObj = await xml.xml2obj(xmlstr);
        if (xmlObj && xmlObj.xml && xmlObj.xml.Encrypt) {
            const encryptedMsg = xmlObj.xml.Encrypt;
            const wxcrypt = new WXCrypt(appID, token, encodingAESKey);
            const decryptedMsg = wxcrypt.decrypt(encryptedMsg);
            const xmlObj2 = await xml.xml2obj(decryptedMsg);
            if (xmlObj2 && xmlObj2.xml && xmlObj2.xml.InfoType === 'component_verify_ticket' && xmlObj2.xml.ComponentVerifyTicket) {
                redisHelper.setExpire('wechat:component_verify_ticket', xmlObj2.xml.ComponentVerifyTicket);
            }
        }
    },
    /**
     * [获取第三方平台component_access_token]
     * 通过component_verify_ticket可以获得component_access_token
     * component_access_token有效期为2小时，调取次数有限制，所以需要缓存起来
     */
    async getComponentAccessToken () {
        const componentAccessToken = await redisHelper.getVal('wechat:component_access_token');
        if (componentAccessToken) {
            return componentAccessToken;
        }
        const ticket = await redisHelper.getVal('wechat:component_verify_ticket');
        const options = {
            uri: `https://api.weixin.qq.com/cgi-bin/component/api_component_token`,
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            body: {
                'component_appid': appID,
                'component_appsecret': secret,
                'component_verify_ticket': ticket
            },
            json: true
        };
        const data = await rp(options);
        if (data && data.component_access_token) {
            // component_access_token 缓存 7200秒
            redisHelper.setExpire('wechat:component_access_token', data.component_access_token, 7200 * 1000);
            return data.component_access_token;
        }
        return '';
    },
    /**
     * [获取预授权码pre_auth_code]
     * 通过component_access_token 获取 pre_auth_code
     * 用来发起授权二维码
     */
    async getPreAuthCode () {
        const componentAccessToken = await Helper.getComponentAccessToken();
        const options = {
            uri: `https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=${componentAccessToken}`,
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            body: {
                'component_appid': appID
            },
            json: true
        };
        const data = await rp(options);
        if (data && data.pre_auth_code) {
            return data.pre_auth_code;
        }
        return '';
    },
    /**
     * [授权后回调URI，得到授权码（authorization_code）和过期时间]
     * 授权成功后保存authorization_info
     */
    setAuthorizationCode (authorizationCode, expiresIn) {
        redisHelper.setExpire('wechat:authorization_code', authorizationCode, +expiresIn * 1000);
    },
    /**
     * [使用授权码换取公众号或小程序的接口调用凭据和授权信息]
     * 缓存Auth
     */
    async setAuth (authorizationCode) {
        const componentAccessToken = await Helper.getComponentAccessToken();
        authorizationCode = authorizationCode || await redisHelper.getVal('wechat:authorization_code');
        const options = {
            uri: `https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=${componentAccessToken}`,
            headers: {
                'content-type': 'application/json'
            },
            method: 'POST',
            body: {
                'component_appid': appID,
                'authorization_code': authorizationCode
            },
            json: true
        };
        const data = await rp(options);
        if (data && data.authorization_info && data.authorization_info.authorizer_appid) {
            // Auth 缓存 7200秒
            // authorizer_refresh_token 永久缓存
            redisHelper.setExpire(`wechat:auth:${data.authorization_info.authorizer_appid}`, JSON.stringify(data.authorization_info), 7200 * 1000);
            redisHelper.set(`wechat:auth:refresh:${data.authorization_info.authorizer_appid}`, data.authorization_info.authorizer_refresh_token);
        }
    },
    /**
     * [获取（刷新）授权公众号或小程序的接口调用凭据（令牌）]
     * 通过appid查找缓存的令牌
     * @param {*} authorizerAppid
     */
    async getAuth (authorizerAppid) {
        const auth = await redisHelper.getVal(`wechat:auth:${authorizerAppid}`);
        if (auth) {
            return JSON.parse(auth);
        }
        const refreshToken = await redisHelper.getVal(`wechat:auth:refresh:${authorizerAppid}`);
        if (refreshToken) {
            const componentAccessToken = await Helper.getComponentAccessToken();
            const options = {
                uri: `https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=${componentAccessToken}`,
                headers: {
                    'content-type': 'application/json'
                },
                method: 'POST',
                body: {
                    'component_appid': appID,
                    'authorizer_appid': authorizerAppid,
                    'authorizer_refresh_token': refreshToken
                },
                json: true
            };
            const data = await rp(options);
            if (data) {
                // Auth 缓存 7200秒
                // authorizer_refresh_token 永久缓存
                redisHelper.setExpire(`wechat:auth:${authorizerAppid}`, JSON.stringify(data), 7200 * 1000);
                redisHelper.set(`wechat:auth:refresh:${authorizerAppid}`, data.authorizer_refresh_token);
                return data;
            }
            return null;
        }
    }
};

module.exports = Helper;
