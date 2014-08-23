Cross-Page-communication
========================

Cross page comet communication with Java cometD as the backend.

Cross-page-communication plugin will keep only one comet connection alive in multi tabs and keep each active page update. There's only one main page connected with the server at the same time. We use this to reduce the server's load.  When the main page was closed, it will change a sub page to the main page. Thanks to `store.js`, it is compatible in all browsers, even IE6. We use `store.js` to share and update messages between multi tabs tabs.

后端基于Java cometD的跨页跨域通信组件

该插件可以在多个标签页在同一时间共享一条comet链接，从而减少服务器压力。它会维护一个队列，当保持链接的主页面被关闭时，会在将其中某个子页面变成新的主页面。它利用`store.js`来决定使用localStorage或者user data或者cookie来共享和更新消息。兼容包括IE6在内的所有主流浏览器

##Dependencies:
* jQuery
* store.js

##License
MIT
