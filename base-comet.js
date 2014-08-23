;(function($) {
	var root = this;

	//****************************************************
	//
	// comet connection
	//
	//****************************************************
	/**
	 * [CometCon description]
	 * @constructor
	 * @param {[type]} settrings [description]
	 */
 	/**
	 * gozap comet组件
	 *
	 * @Constructor
	 *
	 */
	function CometCon(settings) {
		var defaults = {
			logLevel: 'warn'
		};

		$.extend(this, defaults, settings);

		this._init();
	}

	CometCon.prototype = {

		/**
		 * 初始化方法，创建隐藏的iframe，并从iframe中加载cometd对象.
		 */
		_init : function() {
			var self = this,
				i = 0,
				IFRAME_ID = "comet_proxy_iframe",
				iframe = document.getElementById(IFRAME_ID);

			if (null == iframe) {
				$("body").append(
						"<iframe style=\"display:none;\" id=\""+IFRAME_ID+"\" src=\""
								+ self.iframeUrl + "\"></iframe>");
				iframe = document.getElementById(IFRAME_ID);
			}
			this.iframe = iframe;
			if (window.attachEvent) {
				iframe.attachEvent('onload', function() {
					self.iframeOnload.call(self);
				});
			} else {
				iframe.addEventListener('load', function() {
					self.iframeOnload.call(self);
				}, false);
			}

			self.fnTrigger();
		},

		fnTrigger: function() {
			var that = this;

			if ('string' === typeof that.fnType) {
				that[that.fnType] = function(callback) {
					if (that._isReady) {
						if (that.cometd.isDisconnected()) {
							that.cometd.handshake();
						}
						that.cometd.subscribe(CometCon.generateChannel(that.fnType,
								that.appId), callback);
					} else {
						that.addReadyListener(function() {
							that[that.fnType](callback);
						});
					}
				}

			} else {
				$.each(that.fnType, function(i, type) {
					that[type] = function(callback) {
						if (that._isReady) {
							if (that.cometd.isDisconnected()) {
								that.cometd.handshake();
							}
							that.cometd.subscribe(CometCon.generateChannel(type,
									that.appId), callback);
						} else {
							that.addReadyListener(function() {
								that[type](callback);
							});
						}
					}

				});

			}

		},

		broadcast : function(callback) {

			if (this._isReady) {
				if (this.cometd.isDisconnected()) {
					this.cometd.handshake();
				}
				this.cometd.subscribe(CometCon.generateChannel("broadcast",
						this.appId), callback);
			} else {
				this.addReadyListener(function() {
					this.broadcast(callback);
				});
			}
		},

		deliver : function(callback) {

			if (this._isReady) {
				if (this.cometd.isDisconnected()) {
					this.cometd.handshake();
				}
				this.cometd.subscribe(CometCon.generateChannel("service",
						this.appId), callback);
			} else {
				this.addReadyListener(function() {
					this.deliver(callback);
				});
			}
		},

		/**
		 * iframe 加载完成之后，对cometd对象进行初始化 上午11:37:44
		 */
		iframeOnload : function() {
			var self = this, iframe = self.iframe, cometd = iframe.contentWindow.cometd;

			self.cometd = cometd;

			cometd.configure({
				url : self.serviceUrl,
				logLevel : self.logLevel
			});

			if (!this._isReady) {
				this._isReady = true;

				// console.log("this._isReady is :" + this._isReady);
				// console.log("this._onReadyArray is :" + this._onReadyArray);
				if (this._onReadyArray) {
					for ( var i = 0; i < this._onReadyArray.length; i++) {
						this._onReadyArray[i].call(self);
					}
				}
			}
		},

		/**
		 * 添加一个iframe ready事件的监听 下午4:44:50
		 *
		 * @param listener
		 */
		addReadyListener : function(listener) {

			if (!listener) {
				throw new Error("invalid param: listener[" + listener + "]");
			}

			if (!this._onReadyArray) {
				this._onReadyArray = new Array();
			}
			this._onReadyArray.push(listener);
		}
	};

	$.extend(CometCon, {
		generateChannel : function(type, appId) {
			var TYPES = ['broadcast', 'deliver'];

			if ($.inArray(type, TYPES) < 0) {
				throw new Error("invalid param: type");
			}

			if (null == appId || appId.indexOf("/") > -1) {
				throw new Error("invalid param: appId");
			}

			return "/" + type + "/" + appId;
		}
	});
	//********************************************
	//
	// gozap comet
	//
	//********************************************
	function GozapComet(settings) {
		var defaults = {
			isLimitLoop: false,						// is limit the loop of cookie, sample: IM? true, news: false
			isOnFocus: true,
			isActiveTab: false,
			expire: 2000,							// expire time info
			fnType: 'broadcast',					// 'broadcast' || 'deliver'
			loopTimespan: 800,
			onloadFn: function() {
				GozapComet.trace.call('info', 'on load');
			},
			onfocusFn: function() {
				GozapComet.trace.call('info', 'on focus');
			},
			onblurFn: function() {
				GozapComet.trace.call('info', 'on blur');
			},
			onbeforeCloseFn: function() {
				GozapComet.trace.call('info', 'on close');
			},
			closeTip: null
		};

		GozapComet.opts = $.extend(defaults, settings);
		GozapComet.that = this;
		this.init();
		GozapComet.init();

		return this;
	}

	$.extend(GozapComet, {
		init: function() {
			var G = GozapComet,
				opts = G.opts || {},
				thisPID = opts.thisPID;

			$(window).on('load', function() {
				var loadFn = opts.onloadFn,
					PIDArr = store.get('PIDS'),
					isLimitLoop = opts.isLimitLoop,
					expire = store.get('gc_expire'),
					curTime = +new Date,
					defaultExpire = opts.expire,
					isInit = expire ? ((curTime - expire) > defaultExpire ? true : false) : false;

				if (!thisPID) {
					thisPID = opts.thisPID = G.randomID();
					if (!isInit && PIDArr) {
						store.transact('PIDS', function(arr) {
							arr.push(thisPID);
						});

						if (!isLimitLoop)
							G.checkMsg();

					} else {
						if (PIDArr) {
							for (var pid in PIDArr) {
								store.remove(pid);
							}
						}
						store.set('PIDS', [thisPID]);
						opts.isActiveTab = true;
						G.newComet();

					}
				}

				if (loadFn && 'function' === typeof loadFn)
					loadFn.call(null);

			}).on('focus', function() {
				var focusFn = opts.onfocusFn,
					isLimitLoop = opts.isLimitLoop;

				if (isLimitLoop && !opts.hasChecked) {
					G.checkMsg();
					opts.hasChecked = true;
				}

				if (!opts.isOnFocus) {
					opts.isOnFocus = true;

					if (focusFn && 'function' === typeof focusFn)
						focusFn.call(null);

				}

			}).on('blur', function() {
				var blurFn = opts.onblurFn,
					loopTimespan = opts.loopTimespan,
					timeID = opts.timeID,
					isLimitLoop = opts.isLimitLoop;

				if (timeID && isLimitLoop) {
					clearTimeout(timeID);
					opts.timeID = null;
				}

				if (blurFn && 'function' === typeof blurFn)
					blurFn.call(null);

			}).on('beforeunload', function() {
				var beforeCloseFn = opts.onBeforeCloseFn,
					thisPID = opts.thisPID,
					fnType = opts.fnType,
					closeTip = opts.closeTip,
					PIDArr = store.get('PIDS'),
					i = -1;

				while(thisPID !== PIDArr[++i]) {};
				PIDArr.splice(i, 1);

				if (PIDArr.length === 0) {
					store.clear();
				} else {
					store.set('PIDS', PIDArr);
				}

				if ('string' === typeof fnType) {
					store.remove(thisPID + '_' + fnType);
				} else {
					$.each(fnType, function(i, type) {
						store.remove(thisPID + '_' + type);
					});
				}

				// TODO this may cause logic error
				if (beforeCloseFn && 'function' === typeof beforeCloseFn)
					breforeCloseFn.call(null);

				if (closeTip)
					return closeTips;

			});

		},
		newComet: function() {
			var G = GozapComet,
				opts = G.opts,
				CC = new CometCon(opts),
				fnType = opts.fnType,
				thisPID = opts.thisPID,
				that = G.that;

			if ('string' === typeof fnType) {
				CC[fnType](function(msg) {
					for (var i = 0, PIDArr = store.get('PIDS'), PID, PIDData; PID = PIDArr[i]; i++) {
						PIDData = store.get(PID + '_' + fnType);

						if (!PIDData) {
							if (opts.isActiveTab && PID === thisPID) {
								that[fnType].call(msg);
							} else {
								store.set(PID + '_' + fnType, [msg]);
							}
						} else {
							store.transact(PID + '_' + fnType, [], function(arr) {
								arr.push(msg);
							});
						}
					}
				});

			} else {
				$.each(fnType, function(i, type) {
					CC[type](function(msg) {
						for (var i = 0, PIDArr = store.get('PIDS'), PID, PIDData; PID = PIDArr[i]; i++) {
							PIDData = store.get(PID + '_' + type);

							if (!PIDData) {
								if (opts.isActiveTab && PID === thisPID) {
									that[fnType].call(msg);
								} else {
									store.set(PID + '_' + fnType, [msg]);
								}
							} else {
								store.transact(PID + '_' + type, [], function(arr) {
									arr.push(msg);
								});
							}
						}
					});
				});

			}

			G.setExpire();

		},
		setExpire: function() {
			var G = GozapComet,
				opts = G.opts,
				curTime = +new Date,
				expire = opts.expire,
				loopTimespan = opts.loopTimespan;

			store.set('gc_expire', curTime);
			opts.timeID = setTimeout(function() {
				G.setExpire();
			}, loopTimespan);

		},
		checkMsg: function() {
			var G = GozapComet,
				opts = G.opts,
				timeID = opts.timeID,
				loopTimespan = opts.loopTimespan,
				isLoopComplete = opts.isLoopComplete;

			if (opts.isActiveTab)
				return;

			if (isLoopComplete) {
				clearTimeout(timeID);
				opts.isLoopComplete = false;
			} else {
				G._checkMsg();
			}

			opts.timeID = setTimeout(function() {
				G.checkMsg();
			}, loopTimespan);

		},
		_checkMsg: function() {
			var G = GozapComet,
				opts = G.opts,
				thisPID = opts.thisPID,
				fnType = opts.fnType,
				that = G.that,
				PIDArr = store.get('PIDS');

			if (PIDArr && PIDArr[0] === thisPID && !opts.isActiveTab) {
				opts.isActiveTab = true;
				G.newComet();
				if ('string' === typeof fnType) {
					store.remove(thisPID + '_' + fnType);

				} else {
					$.each(fnType, function(i, type) {
						store.remove(thisPID + '_' + type);
					});

				}
			}

			if (!opts.isActiveTab) {
				if ('string' === typeof fnType) {
					var msg;
					store.transact(thisPID + '_' + fnType, [], function(arr) {
						if (arr.length > 0) {
							msg = arr.splice(0);
						} else {
							msg = arr = null;
						}

					});

					// invoke callback handler
					if (msg) {
						G.trace.call('warn', msg);
						that[fnType].call(msg);
					}

				} else {
					$.each(fnType, function(i, type) {
						var msg;
						store.transact(thisPID + '_' + type, [], function(arr) {
							if (arr.length > 0) {
								msg = arr.splice(0);
							} else {
								msg = arr = null;
							}

						});

						// invoke callback handler
						if (msg) {
							that[type].call(msg);
						}

					});

				}
			}

			if (thisPID === PIDArr[PIDArr.length - 1]) {
					var curTime = +new Date;

					store.set('gc_expire', curTime);
			}

			opts.isLoopComplete = true;
		},
		randomID: function() {
			return 'gc_' + parseInt(Math.random()*10000, 10);
		},
		trace: function() {
			var type = this,
				fn = '',
				$log = $('#log');

			if ('object' === typeof type) {
				for (var i in type) {
					fn += type[i];
				}
			}

			if ('undefined' !== typeof console) {
				if ('function' === typeof console[fn]) {
					console[fn](arguments);
				} else {
					console.log(arguments);
				}
			} else if ($log.length) {
				var text = $log.text();
					text += store.serialize(arguments);

				$log.text(text);
			} else {
				alert(store.serialize(arguments));
			}
		}
	});

	/**
	 * GozapComet dynamic method
	 */
	$.extend(GozapComet.prototype, {
	 	init: function() {
	 		var that = this,
	 			fnType = GozapComet.opts.fnType;

	 		if ('string' === typeof fnType) {
	 			that[fnType] = function(callback) {
	 				var msg = this,
	 					handlerList = that[fnType].handlerList = that[fnType].handlerList || [];

	 				if (callback && 'function' === typeof callback)
	 					handlerList.push(callback);

	 				for (var i = 0, handler; handler = handlerList[i]; i++) {
	 					if (msg instanceof Array) {
	 						for (var j = 0, m; m = msg[j]; j++) {
	 							handler(m);
	 						}
	 					} else {
	 						handler(msg);
	 					}
	 				}
	 			}
	 		} else {
		 		$.each(fnType, function(i, type) {
		 			that[type] = function(callback) {
		 				var msg = this,
	 						handlerList = that[fnType].handlerList = that[fnType].handlerList || [];

		 				if (callback && 'function' === typeof callback)
		 					handlerList.push(callback);

		 				for (var i = 0, handler; handler = handlerList[i]; i++) {
		 					if (msg instanceof Array) {
		 						for (var j = 0, m; m = msg[j]; j++) {
		 							handler(m);
		 						}
		 					} else {
		 						handler(msg);
		 					}
		 				}
		 			}
		 		});
	 		}
	 	}
	});

	if ('undefined' !== typeof module && module.exports) {
		module.exports = GozapComet;
	} else {
		root.GozapComet = GozapComet;
	}

})(jQuery);