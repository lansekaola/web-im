var React = require("react");
var ReactDOM = require('react-dom');

var Webim = require('./components/webim');

var textMsg = require('./components/message/txt');
var imgMsg = require('./components/message/img');
var fileMsg = require('./components/message/file');
var locMsg = require('./components/message/loc');
var audioMsg = require('./components/message/audio');
var videoMsg = require('./components/message/video');
var Notify = require('./components/common/notify');

module.exports = {
    log: function () {
        if (typeof window === 'object') {
            if (typeof console !== 'undefined' && typeof console.log === 'function') {
                console.log.apply(console, arguments);
            }
        }
    },

    render: function (node, change) {
        this.node = node;

        var props = {};
        switch (change) {
            case 'roster':
                props.rosterChange = true;
                break;
            case 'group':
                props.groupChange = true;
                break;
            case 'chatroom':
                props.chatroomChange = true;
                break;
            case 'stranger':
                props.strangerChange = true;
                break;
            default:
                props = null;
                break;
        }


        if (props) {
            ReactDOM.render(<Webim config={WebIM.config} close={this.logout} {...props} />, this.node);
        } else {
            ReactDOM.render(<Webim config={WebIM.config} close={this.logout}/>, this.node);
        }
    },


    logout: function (type) {
        if (WebIM.config.isWindowSDK) {
            WebIM.doQuery('{"type":"logout"}',
                function (response) {
                    Demo.api.init();
                },
                function (code, msg) {
                    Demo.api.NotifyError("logout:" + msg);
                });
        } else {
            console.log('logout=', type);
            Demo.conn.close('logout');
            if (type == WebIM.statusCode.WEBIM_CONNCTION_CLIENT_LOGOUT) {
                Demo.conn.errorType = type;
            }
        }

    },

    init: function () {
        console.log('api.init()');
        Demo.selected = null;
        Demo.user = null;
        Demo.call = null;
        Demo.roster = {};
        Demo.strangers = {};

        ReactDOM.unmountComponentAtNode(this.node);
        this.render(this.node);
    },
    appendMsg: function (msg, type) {
        if (!msg) {
            return;
        }
        msg.from = msg.from || Demo.user;
        msg.type = msg.type || 'chat';

        this.sentByMe = msg.from === Demo.user;

        var brief = '',
            data = msg.data || msg.msg || '',
            name = this.sendByMe ? Demo.user : msg.from,
            targetId = this.sentByMe || msg.type !== 'chat' ? msg.to : msg.from,
            targetNode = document.getElementById('wrapper' + targetId);
        data = decodeURIComponent(data);

        if (!this.sentByMe && msg.type === 'chat' && !targetNode) {
            Demo.strangers[targetId] = Demo.strangers[targetId] || [];
        } else if (!targetNode) {
            return;
        }

        switch (type) {
            case 'txt':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: 'txt'});
                } else {
                    brief = WebIM.utils.parseEmoji(this.encode(data).replace(/\n/mg, ''));
                    textMsg({
                        wrapper: targetNode,
                        name: name,
                        value: brief,
                    }, this.sentByMe);
                }
                break;
            case 'emoji':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: 'emoji'});
                } else {
                    for (var i = 0, l = data.length; i < l; i++) {
                        brief += data[i].type === 'emoji'
                            ? '<img src="' + WebIM.utils.parseEmoji(this.encode(data[i].data)) + '" />'
                            : this.encode(data[i].data);
                    }
                    textMsg({
                        wrapper: targetNode,
                        name: name,
                        value: brief,
                    }, this.sentByMe);
                }
                break;
            case 'img':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: 'img'});
                } else {
                    if (WebIM.config.isWindowSDK) {
                        var cur = document.getElementById('file_' + msg.id);
                        if (cur) {
                            var listenerName = 'onUpdateFileUrl' + msg.id;
                            if (Demo.api[listenerName]) {
                                Demo.api[listenerName]({url: msg.url});
                                Demo.api[listenerName] = null;
                            } else {
                                console.log('listenerName not exists:' + msg.id);
                            }
                            return;
                        } else {
                            brief = '[' + Demo.lan.image + ']';
                            imgMsg({
                                id: msg.id,
                                wrapper: targetNode,
                                name: name,
                                value: data || msg.url,
                            }, this.sentByMe);
                        }
                    } else {
                        brief = '[' + Demo.lan.image + ']';
                        imgMsg({
                            id: msg.id,
                            wrapper: targetNode,
                            name: name,
                            value: data || msg.url,
                        }, this.sentByMe);
                    }
                }
                break;
            case 'aud':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: type});
                } else {
                    if (WebIM.config.isWindowSDK) {
                        var cur = document.getElementById('file_' + msg.id);
                        if (cur) {
                            var listenerName = 'onUpdateFileUrl' + msg.id;
                            if (Demo.api[listenerName]) {
                                Demo.api[listenerName]({url: msg.url});
                                Demo.api[listenerName] = null;
                            } else {
                                console.log('listenerName not exists:' + msg.id);
                            }
                            return;
                        } else {
                            brief = '[' + Demo.lan.file + ']';
                            fileMsg({
                                id: msg.id,
                                wrapper: targetNode,
                                name: name,
                                value: data || msg.url,
                                filename: msg.filename
                            }, this.sentByMe);
                        }
                    } else {
                        brief = '[' + Demo.lan.audio + ']';
                        audioMsg({
                            wrapper: targetNode,
                            name: name,
                            value: data || msg.url,
                            length: msg.length,
                            id: msg.id
                        }, this.sentByMe);
                    }
                }
                break;
            case 'cmd':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: 'cmd'});
                } else {
                    brief = '[' + Demo.lan.cmd + ']';
                }
                break;
            case 'file':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: 'file'});
                } else {
                    if (WebIM.config.isWindowSDK) {
                        var cur = document.getElementById('file_' + msg.id);
                        if (cur) {
                            var listenerName = 'onUpdateFileUrl' + msg.id;
                            if (Demo.api[listenerName]) {
                                Demo.api[listenerName]({url: msg.url});
                                Demo.api[listenerName] = null;
                            } else {
                                console.log('listenerName not exists:' + msg.id);
                            }
                            return;
                        } else {
                            brief = '[' + Demo.lan.file + ']';
                            fileMsg({
                                id: msg.id,
                                wrapper: targetNode,
                                name: name,
                                value: data || msg.url,
                                filename: msg.filename
                            }, this.sentByMe);
                        }
                    } else {
                        brief = '[' + Demo.lan.file + ']';
                        fileMsg({
                            id: msg.id,
                            wrapper: targetNode,
                            name: name,
                            value: data || msg.url,
                            filename: msg.filename
                        }, this.sentByMe);
                    }


                }
                break;
            case 'loc':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: 'loc'});
                } else {
                    brief = '[' + Demo.lan.location + ']';
                    locMsg({
                        wrapper: targetNode,
                        name: name,
                        value: data || msg.addr
                    }, this.sentByMe);
                }
                break;
            case 'video':
                if (!targetNode) {
                    Demo.strangers[targetId].push({msg: msg, type: type});
                } else {
                    if (WebIM.config.isWindowSDK) {
                        var cur = document.getElementById('file_' + msg.id);
                        if (cur) {
                            var listenerName = 'onUpdateFileUrl' + msg.id;
                            if (Demo.api[listenerName]) {
                                Demo.api[listenerName]({url: msg.url});
                                Demo.api[listenerName] = null;
                            } else {
                                console.log('listenerName not exists:' + msg.id);
                            }
                            return;
                        } else {
                            brief = '[' + Demo.lan.file + ']';
                            fileMsg({
                                id: msg.id,
                                wrapper: targetNode,
                                name: name,
                                value: data || msg.url,
                                filename: msg.filename
                            }, this.sentByMe);
                        }
                    } else {
                        brief = '[' + Demo.lan.video + ']';
                        videoMsg({
                            wrapper: targetNode,
                            name: name,
                            value: data || msg.url,
                            length: msg.length,
                            id: msg.id
                        }, this.sentByMe);
                    }
                }
                break;
            default:
                break;
        }


        if (!targetNode) {
            this.render(this.node, 'stranger');
            return;
        }

        // show brief
        this.appendBrief(targetId, brief);

        if (msg.type === 'cmd') {
            return;
        }

        // show count
        switch (msg.type) {
            case 'chat':
                if (this.sentByMe) {
                    return;
                }
                var contact = document.getElementById(msg.from),
                    cate = Demo.roster[msg.from] ? 'friends' : 'strangers';

                this.addCount(msg.from, cate);
                break;
            case 'groupchat':
                var cate = msg.roomtype ? msg.roomtype : 'groups';

                this.addCount(msg.to, cate);
                break;
        }


    },

    appendBrief: function (id, value) {
        var cur = document.getElementById(id);
        cur.querySelector('em').innerHTML = value;
    },


    addCount: function (id, cate) {
        if (Demo.selectedCate !== cate) {
            var curCate = document.getElementById(cate).getElementsByTagName('i')[1];
            curCate.style.display = 'block';

            var cur = document.getElementById(id).querySelector('i');
            var curCount = cur.getAttribute('count') / 1;
            curCount++;
            cur.setAttribute('count', curCount);
            cur.innerText = curCount > 999 ? '...' : curCount + '';
            cur.style.display = 'block';
        } else {
            if (!this.sentByMe && id !== Demo.selected) {
                var cur = document.getElementById(id).querySelector('i');
                var curCount = cur.getAttribute('count') / 1;
                curCount++;
                cur.setAttribute('count', curCount);
                cur.innerText = curCount > 999 ? '...' : curCount + '';
                cur.style.display = 'block';
            }
        }

    },

    updateChatroom: function () {
        this.render(this.node, 'chatroom');
    },

    updateRoster: function () {
        this.render(this.node, 'roster');
    },

    updateGroup: function (groupId) {
        this.render(this.node, 'group');
    },

    deleteFriend: function (username) {
        Demo.conn.removeRoster({
            to: username,
            success: function () {
                Demo.conn.unsubscribed({
                    to: username
                });

                var dom = document.getElementById(username);
                dom && dom.parentNode.removeChild(dom);
            },
            error: function () {
            }
        });
    },

    changeGroupSubjectCallBack: function (id, subject) {
        var cur = document.getElementById(id);
        cur.querySelector('span').innerHTML = subject;
    },

    encode: function (str) {
        if (!str || str.length === 0) {
            return '';
        }
        var s = '';
        s = str.replace(/&amp;/g, "&");
        s = s.replace(/<(?=[^o][^)])/g, "&lt;");
        s = s.replace(/>/g, "&gt;");
        s = s.replace(/\"/g, "&quot;");
        s = s.replace(/\n/g, "<br>");
        return s;
    },
    getObjectKey: function (obj, val) {
        for (var key in obj) {
            if (obj[key] == val) {
                return key;
            }
        }
        return '';
    },
    NotifyError: function (msg) {
        Notify.error(msg);
    },
    NotifySuccess: function (msg) {
        Notify.success(msg);
    },
    scrollIntoView: function (node) {
        setTimeout(function () {
            node.scrollIntoView(true);
        }, 50);
    },
    listen: function (options) {
        for (var key in options) {
            this[key] = options[key];
        }
    }

};
