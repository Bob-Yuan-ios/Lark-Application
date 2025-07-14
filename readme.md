POST /notify   （Google App Script 请求）
   ↓
notify.router.js
   ↓
notify.controller.js
   ↓
根据 body.command 分发
   ↓
dispatchers/*.handler.js
   ↓
services/lark.service.js 发送 Lark 消息
