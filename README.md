Node微信第三方平台开发
=====

#### 1. 保存component_verify_ticket 
````
微信服务器每十分钟会将component_verify_ticket回调到自己服务器，
需要解密
````

#### 2. 获取component_access_token
````
component_access_token有效期为2小时，调取次数有限制，所以需要缓存起来
````

#### 3. 获取pre_auth_code
````
pre_auth_code用来发起授权二维码，发起授权吗链接必须放在a标签中，点击后弹出授权二维码，不可直接用链接打开

````

#### 4. 获取authorization_code  && authorizer_access_token
````
发起授权二维码后，用户选择授权的公众号，会将调用凭据（获取authorization_code）回调到自己服务器，然后马上通过authorization_code 获取 authorizer_access_token 与authorizer_refresh_token
````

#### 5. 通过authorizer_refresh_token刷新authorizer_access_token
````
将authorizer_refresh_token永久保存，authorizer_access_token过期用它刷新，刷新获得新的authorizer_refresh_token继续永久保存
````