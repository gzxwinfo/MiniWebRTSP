;(function (name, definition) {
  // 检测上下文环境是否为AMD或CMD
  var hasDefine = typeof define === 'function',
    // 检查上下文环境是否为Node
    hasExports = typeof module !== 'undefined' && module.exports;
 
  if (hasDefine) {
    // AMD环境或CMD环境
    define(definition);
  } else if (hasExports) {
    // 定义为普通Node模块
    module.exports = definition();
  } else {
    // 将模块的执行结果挂在window变量中，在浏览器中this指向window对象
    this[name] = definition();
  }
})('MinisRtspPlayer', function () {

	"use strict"

	// ERROR=0, WARN=1, LOG=2, DEBUG=3
	  var LogLevel = {
	      Error: 0,
	      Warn: 1,
	      Log: 2//,
	      //Debug: 3
	  };

  	var DEFAULT_LOG_LEVEL = LogLevel.Error;

	var Logger = function () {
	  	var level = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_LOG_LEVEL;
      	var tag = arguments[1];
      	this.tag = tag;
      	this.setLevel(level);
  	};
  	
  	Logger.level_map = {
  		0 : "error",
  		1 : "warn",
  		2 : "log"//,
  		//3 : "debug"
  	};
  
	Logger.prototype.setLevel = function(level) {
	  	this.level = level;
  	}
  	Logger.prototype._log = function(lvl, args) {
	  	args = Array.prototype.slice.call(args);
	  	if (this.tag) {
		  	args.unshift('[' + this.tag + ']');
	  	}
	  	if (this.level >= lvl) console[Logger.level_map[lvl]].apply(console, args);
	}
  	Logger.prototype.log = function() {
	  	this._log(LogLevel.Log, arguments);
  	}
  	Logger.prototype.debug = function() {
	  	this._log(LogLevel.Debug, arguments);
  	}
  	Logger.prototype.error = function() {
	  	this._log(LogLevel.Error, arguments);
  	}
  	Logger.prototype.warn = function() {
	  	this._log(LogLevel.Warn, arguments);
  	}
  	

  	function Utf8ArrayToStr(array) {
  	    var out, i, len, c;
  	    var char2, char3;
  	 
  	    out = "";
  	    len = array.length;
  	    i = 0;
  	    while(i < len) {
  	    c = array[i++];
  	    switch(c >> 4)
  	    { 
  	      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
  	        // 0xxxxxxx
  	        out += String.fromCharCode(c);
  	        break;
  	      case 12: case 13:
  	        // 110x xxxx   10xx xxxx
  	        char2 = array[i++];
  	        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
  	        break;
  	      case 14:
  	        // 1110 xxxx  10xx xxxx  10xx xxxx
  	        char2 = array[i++];
  	        char3 = array[i++];
  	        out += String.fromCharCode(((c & 0x0F) << 12) |
  	                       ((char2 & 0x3F) << 6) |
  	                       ((char3 & 0x3F) << 0));
  	        break;
  	    }
  	    }
  	 
  	    return out;
  	}

	var dispatchEvent = function(trigger, name, args) {
  		if(trigger.dispatchEvent) {  
  		  	var event = document.createEvent('Event');
  		  	event.initEvent(name, true, true);
  		  	event.data = args;
  		  	trigger.dispatchEvent(event);
  		} else {
  			trigger.fireEvent(event);
  		}
	}
			
	var VERSION = "1.6.2";
	var CODECS_VOIDE = 'video/mp4; codecs="avc1.64001E"',
		CODECS_AUDIO = 'audio/mp4; codecs="mp4a.40.2"';

	var EventNames = {
		beforePlay : "xwMdeia_beforePlay",					//开始播放（开始请求后台进行播放）
		play : "xwMdeia_play",								//播放
		stop : "xwMdeia_stop",								//停止
		error : "xwMdeia_error",							//发生错误
	};

	var isSupported = function() {
        return window.MediaSource && window.MediaSource.isTypeSupported('video/mp4; codecs="avc1.4D401E"');
    }

  	var Log$1 = new Logger(DEFAULT_LOG_LEVEL, "MinisRtspPlayer");

	var creIdFn = (function() {
		var idIndex = 0;
		return function() {
			idIndex = idIndex + 1;
			return idIndex; 
		}
	})();
	
	//默认配置
	var defConfig = {
		server : "ws://127.0.0.1:10086"
	};
	
	var setConfig = function(dConfig, sConfig) {
		for (var name in sConfig) {
			if (dConfig[name] === undefined || dConfig[name] === null) {
				dConfig[name] = sConfig[name];
			}
		}
	} 
	
	var MinisRtspPlayer = function(url, video, config, evnetTrigger) {
		this._id = creIdFn();
		this._url = url;
		this._video = video;
		var meConfig = this._config = config || {};

		setConfig(meConfig, MinisRtspPlayer.defConfig);

		if (meConfig.logLevel !== undefined && meConfig.logLevel !== null) {
			Log$1.setLevel(meConfig.logLevel);
		}

		//如果独立使用时，如果没有设置事件触发对象，则用video元素
		//	为了兼容独立使用及与video.js等插件整合使用的情况
		//		video.js使用的是他自己创建的div作为事件触发对象
		if (!evnetTrigger) {
			evnetTrigger = this._video; 
		}
		this._evnetTrigger = evnetTrigger;

		this._isPlay = false;
		
		this._init();
	};
	
	MinisRtspPlayer.isSupported = isSupported();
	
	MinisRtspPlayer.Events = EventNames;

	MinisRtspPlayer.LogLevel = LogLevel;
	MinisRtspPlayer.defConfig = defConfig;

	MinisRtspPlayer.version = VERSION;

	MinisRtspPlayer.prototype._id = null;
	MinisRtspPlayer.prototype._isPlay = false;
	MinisRtspPlayer.prototype._isInit = null;
	MinisRtspPlayer.prototype._isCreAudio = false;

	MinisRtspPlayer.prototype._video = null;
	MinisRtspPlayer.prototype._audio = null;

	MinisRtspPlayer.prototype._vMes = null;
	MinisRtspPlayer.prototype._aMes = null;

	MinisRtspPlayer.prototype._bufferDelay = 0.15; 		//延迟时间
	MinisRtspPlayer.prototype._bufferDelayOffect = 0.3;	//延迟可忽略的时间
	MinisRtspPlayer.prototype._setCurrentTimeInterval = 1000 * 10;

	MinisRtspPlayer.prototype._bufferDuration = 125;
					
	MinisRtspPlayer.prototype._keepaliveTime = 1000;
	MinisRtspPlayer.prototype._keepaliveInterval = 500;
	
	MinisRtspPlayer.prototype._isDestroyd = false;

	MinisRtspPlayer.prototype._init = function() {
		if (!this._isInit) {
			this._isInit = true;

			var video = this._video;

			this._vMes = new Mse(this, "video", video);
			//video.duration = 0;
			//video.autoplay = true;

			var audio;
	        var child, childs = video.childNodes;
	        for (var i=0, l=childs.length; i<l; i++) {
	      	  child = childs[i];
	      	  if (child.tagName == "AUDIO") {
	      		  audio = child;
	      		  break;
	      	  }
	        }
	        
	        if (!audio) {
	        	audio = this._audio = document.createElement("AUDIO");
	        	video.appendChild(audio);
	        	this._isCreAudio = true;
	        } else {
	        	this._audio = audio;
	        	this._isCreAudio = false;
	        }
			video.addEventListener("volumechange", this._volumechange);
			audio.muted = video.muted;
			//audio.duration = 0;
			//audio.autoplay = true;
			this._aMes = new Mse(this, "audio", audio);
			audio.play();
		}
	}
	
	MinisRtspPlayer.prototype._dispatchEvent = function(name, args) {
		var data = {
			id:this._id, 
			url : this._url
		};
		if (args) {
			data.args = args;
		}
		Log$1.log("minisRtspPlayer[" + this._id + "] dispatchEvent " + name +":", data);
		dispatchEvent(this._evnetTrigger, name, data);
	}
			
	MinisRtspPlayer.prototype._volumechange = function() {
        var audioEl = null, video = this;
        var child, childs = video.childNodes;
        for (var i=0, l=childs.length; i<l; i++) {
      	  child = childs[i];
      	  if (child.tagName == "AUDIO") {
      		  audioEl = child;
      		  break;
      	  }
        }
        audioEl.volume = video.volume;
        audioEl.muted = video.muted;
	}

	/**
	 * 播放
	 */
	MinisRtspPlayer.prototype.play = function() {
		if (this._isPlay) {
			return;
		}
		this._isPlay = true;

	    var ws = this._ws = new WebSocket(this._config.server);
	    ws.binaryType = 'arraybuffer';
	    ws.onopen = function (ev) {
	    	this._dispatchEvent(EventNames.beforePlay);
	    	ws.send("play:" + this._url + "\n");
	    	this._startKeepAlive();
	    	Log$1.log("minisRtspPlayer[" + this._id + "] 连接成功");
	    }.bind(this);
	    ws.onerror = function (ev) {
	    	Log$1.error("minisRtspPlayer[" + this._id + "] 连接错误");
	    	this._dispatchEvent(EventNames.error);
	    }.bind(this);
	    ws.onclose = function (ev) {
	    	this._stopKeepAlive();
	    	Log$1.log("minisRtspPlayer[" + this._id + "] 连接关闭");
	    }.bind(this);
	    ws.onmessage = function (ev) {
	    	this._feed(ev.data);
	    }.bind(this);
	}

	/**
	 * 开始心跳
	 */
	MinisRtspPlayer.prototype._startKeepAlive = function() {
        this._keepaliveInterval = setInterval(function () {
           this._KeepAlive();
        }.bind(this), this._keepaliveTime);
	}

	/**
	 * 停止心跳
	 */
	MinisRtspPlayer.prototype._stopKeepAlive = function() {
		if (this._keepaliveInterval) {
			clearInterval(this._keepaliveInterval);
			this._keepaliveInterval = null;
		}
	}
	
	/**
	 * 发送心跳
	 */
	MinisRtspPlayer.prototype._KeepAlive = function() {
		if (this._ws) {
			this._ws.send("keep:\n");
		}
	}

	/**
	 * 喂数据
	 */
	MinisRtspPlayer.prototype._feed = function(data) {
		//if (data.byteLength<100) {
		//	return;
		//}
		var udata = new Uint8Array(data); 
		if (udata[0] == 1 && udata[1] == 1 && udata[2] == 1 && udata[3] == 1) {
			this._vMes.feed(data.slice(4));
		} else if (udata[0] == 2 && udata[1] == 2 && udata[2] == 2 && udata[3] == 2) {
			this._aMes.feed(data.slice(4));
		} else {
			var dataString = Utf8ArrayToStr(udata);
			Log$1.error("minisRtspPlayer[" + this._id + "]" + dataString);
			this._dispatchEvent(EventNames.error, {error:dataString});
		}
	}

	/**
	 * 停止
	 */
	MinisRtspPlayer.prototype.stop = function() {
		this._isPlay = false;
		if (this._ws) {
			this._ws.close();
			this._ws = null;
		}

		if (this._vMes) {
			this._vMes.stop();
		}
		if (this._aMes) {
			this._aMes.stop();
		}
		this._dispatchEvent(EventNames.stop);
	}
	
	/**
	 * 销毁
	 */
	MinisRtspPlayer.prototype.destroy = function() {
		this._isDestroyd = true;
		this.stop();
		if (this._isCreAudio) {
			this._video.removeChild(this._audio);
		}
		this._video.removeEventListener("volumechange", this._volumechange);
		this._vMes = null;
		this._aMes = null;
		this._video = null;
		this._audio = null;
		this._evnetTrigger = null;
	}

	/**
	 * Media数据管理
	 */
	var Mse = function(minisRtspPlayer, type, el) {
		this._minisRtspPlayer = minisRtspPlayer;
		this._type = type;
		this._el = el;
		
		this._isSendPlayEventd = false;
		this._isDestroyd = false;
		this._srcUrl = null;
		this._mediaSource = null;
		this._sourceBuffer = null;
		
		this._isVideo = this._type == "video";

		this._resPlayIng = false;
		this._errorDataNum = 0;
		this._firstData = [];
		this._queue = [];
		this._init();
	}

	Mse.prototype._init = function() {
		this._mediaSource = new MediaSource();	
		this._srcUrl = this._el.src = URL.createObjectURL(this._mediaSource);
		this._mediaSource.addEventListener('sourceopen', this._onMediaSourceOpen.bind(this));
	}

	Mse.prototype._onMediaSourceOpen = function() {
		this._mediaSource.removeEventListener('sourceopen', this._onMediaSourceOpen);	
		this._sourceBuffer = this._mediaSource.addSourceBuffer(this._isVideo ? CODECS_VOIDE : CODECS_AUDIO);
		//this._sourceBuffer.mode = 'sequence';
		this._sourceBuffer.addEventListener("updateend", this._onUpdateend.bind(this));
		this._sourceBuffer.addEventListener("error", this._onError.bind(this));
	};

	Mse.prototype._onError = function() {
		if (!this._resPlayIng) {
			this._errorDataNum = 10;
			this._resPlay();
		}
	}

	Mse.prototype._onUpdateend = function() {
		if (this._isDestroyd) {
			return;
		}
		this._feedNext();
		var el = this._el,
			mediaSource = this._mediaSource,
			sourceBuffer = this._sourceBuffer,
			minisRtspPlayer = this._minisRtspPlayer;
		try {
	    	if (!this._resPlayIng && sourceBuffer && !sourceBuffer.updating && mediaSource.readyState == "open") {
	    	    if (sourceBuffer.buffered.length>0) {
	    	    	if (this._isVideo && !this._isSendPlayEventd) {
	    	    		this._isSendPlayEventd = true;
	    	    		minisRtspPlayer._dispatchEvent(EventNames.play);
	    	    	}
	    	    	var newPlayTime = sourceBuffer.buffered.end(0);
	                //var newPlayTime2 = parseInt((sourceBuffer.buffered.end(0) - minisRtspPlayer._bufferDelay) * 10 / 10);
	                var dTime = newPlayTime - el.currentTime;
	                if (dTime > minisRtspPlayer._bufferDelayOffect && newPlayTime > 0) {
	        	    	newPlayTime = newPlayTime - minisRtspPlayer._bufferDelay;
	        	    	if (el.currentTime<newPlayTime) {
		                	var now = (new Date()).getTime();
		        	    	if (this._setCurrentTimeH && this._setCurrentTimeH + minisRtspPlayer._setCurrentTimeInterval > now) {
		        	    		return;
		        	    	}this._setCurrentTimeH = now;
	        	    		Log$1.log("minisRtspPlayer[" + minisRtspPlayer._id + "]." + this._type + ".currentTime:from " + el.currentTime + " to " + newPlayTime);
	        	    	}
	                	//console.log();
	                	el.currentTime = newPlayTime + "";
	                }
	    	    }
	    	}
		} catch (e) {
			console.error(e);
		}
	}

	Mse.prototype._resPlay = function() {
		if (this._resPlayIng) {
			return;
		}
		if (this._errorDataNum < 10) {
			this._errorDataNum = this._errorDataNum + 1;
			return;
		}
		this._resPlayIng = true;

		this.stop();
		this._init();

		this._queue = [].concat(this._firstData);
		this._el.play();

		this._resPlayIng = false;
		this._errorDataNum = 0;
		
	}

	Mse.prototype.stop = function() {
		if (this._mediaSource) {
			try {
				this._mediaSource.removeEventListener('sourceopen', this._onMediaSourceOpen);
			} catch(e) {
			}
			if (this._mediaSource.sourceBuffers.length) {
				this._mediaSource.removeSourceBuffer(this._sourceBuffer);
			}
			this._mediaSource = null;
		}
		if (this._sourceBuffer) {
			try {
				this._sourceBuffer.removeEventListener('updateend', this._onUpdateend);
			} catch(e) {
			}
		}
		if (this._srcUrl) {
			URL.revokeObjectURL(this._srcUrl);
			this._srcUrl = null;
		}
		this._sourceBuffer = null;
		this._queue = null;
	}

	Mse.prototype._feedNext = function() {
		var sourceBuffer = this._sourceBuffer;
		var queue = this._queue;
	    if (sourceBuffer && !sourceBuffer.updating && queue && queue.length) {
	    	try {
	    		sourceBuffer.appendBuffer(queue.shift());
	    	}catch (e) {
	    		this._resPlay();
	    		//debugger;
	    		console.error(e);
				// TODO: handle exception
			}
	    }
	}

	Mse.prototype.feed = function(data) {
		if (!this._resPlayIng && this._queue) {
			if (this._firstData.length<2) {
				this._firstData.push(data);
			}
			if (this._isVideo) {
				//console.timeEnd("getData");
				//console.time("getData");
			}
			this._queue.push(data);
			//this._cleanupBuffer();
			this._feedNext();
		}
	}

	Mse.prototype._cleanupBuffer = function() {
		var sourceBuffer = this._sourceBuffer,
			minisRtspPlayer = this._minisRtspPlayer;
		var isCleand = false;
	    if ((this._updatesToCleanup++) > 200) {
	    	isCleand = true;
	    	this._updatesToCleanup = 0;
	    }

	    if (isCleand && sourceBuffer && sourceBuffer.buffered.length && !sourceBuffer.updating) {
	        var currentPlayTime = this._video.currentTime;
	        var startBuffered = sourceBuffer.buffered.start(0);
	        var endBuffered = sourceBuffer.buffered.end(0);
	        var bufferedDuration = endBuffered - startBuffered;
	        var removeEnd = endBuffered - minisRtspPlayer._bufferDuration;

	        if (removeEnd > 0 && bufferedDuration > minisRtspPlayer._bufferDuration && currentPlayTime > startBuffered && currentPlayTime > removeEnd) {
	            try {
	            	console.log("cleanup buffer " + startBuffered + " " + removeEnd);	
	                sourceBuffer.remove(startBuffered, removeEnd);
	            } catch (e) {
	                console.warn("Failed to cleanup buffer");
	            }
	        }
	    }
	}

	Mse.prototype.destroy = function() {
		this._isDestroyd = true;

		this.stop();

		this._srcUrl = null;
		this._mediaSource = null;
		this._sourceBuffer = null;
		this._queue = null;

		this._minisRtspPlayer = null;
		this._el = null;
	}

	//video.js 插件
	if (videojs) {
		var eventMap = {};

		var removeEvents = function(player, playerSrc) {
	    	var el = player._video;
	    	var fns = eventMap[player._id];
	    	el.removeEventListener("play", fns.play);
	    	playerSrc.el_.removeEventListener(EventNames.error, fns.error);
	    	playerSrc.off("dispose");
	    	//playerSrc.off("error");
	    	delete eventMap[player._id];
		}

		var MainMinisRtspPlayer = function () {};
		MainMinisRtspPlayer.prototype.initPlayer = function(source, tech, techOptions) {
			var player = videojs.getPlayer(techOptions.playerId);
		    var el = tech.el();
		    var _player_ = player._player_;
		    if (_player_) {
		    	removeEvents(_player_, player);
		    	_player_.destroy();
		    }
		    _player_ = player._player_ = new MinisRtspPlayer(source.src, el, player.options_.minisRtspPlayerConfig, player.el_);
		    var evnetObjId = _player_._id;
		    var eventObj = eventMap[evnetObjId] = {
		    	play : function () {
			    	this.play();
			    }.bind(player._player_),
			    dispose : function () {
			    	removeEvents(this._player_, this);
			    	this._player_.destroy();
			    }.bind(player),
			    error : function(event) {
			    	//debugger;
			    	//this.error_ = event.data.args.error;
			    	this.error(event.data.args.error);	
			    }.bind(player)
		    };
		    el.addEventListener('play', eventObj.play, false);
		    player.one("dispose", eventObj.dispose);
		    			
		    player.el_.addEventListener(EventNames.error, eventObj.error, false);
		    //player.on(eventObj.error, ;
		    player.el_.addEventListener('play', eventObj.play, false);
		    
		    
		}

		MainMinisRtspPlayer.prototype.handleSource = function(source, tech, techOptions) {
			this.initPlayer(source, tech, techOptions);
		}

		var CAN_PLAY_TYPE = "application/x-rtsp";

		var LiveSourceHandler = function () {
			this._handle_ = new MainMinisRtspPlayer();
		};

		LiveSourceHandler.prototype.canHandleSource = function(source) {
			var type = source.type;
			if (!type && source.src) {
				type = source.src.indexOf("rtsp://") === 0 ? CAN_PLAY_TYPE : "";
			}
		    return MinisRtspPlayer.isSupported && this.canPlayType(type);
		}

		LiveSourceHandler.prototype.handleSource = function(source, tech, options) {
		    return this._handle_.handleSource(source, tech, options);
		}

		LiveSourceHandler.prototype.canPlayType = function(type) {
		    return (type && type == CAN_PLAY_TYPE) ? "probably" : "";
		}

		var Html5Tech = videojs.getTech('Html5');
		if (Html5Tech) {
			Html5Tech.registerSourceHandler(new LiveSourceHandler(), 0);
		}
	}

	return MinisRtspPlayer;
});			