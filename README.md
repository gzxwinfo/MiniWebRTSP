# MiniWebRTSP

#### 介绍
网页轻量化无插件多路播放RTSP视频。
通过WS协议实现超低延迟高性能，无需要经过浏览器转码，可达到与原生应用一样的性能（500ms以内）。多厂家、多设备类型支持，支持网络IPC、NVR、行业化监控平台。简单的接入方式，只需知道播放的RTSP地址即可接入。

#### 主要特点
1.  轻量化，无插件
2.  低延迟，高性能
3.  支持多路播放
4.  接入简单


#### 浏览器兼容性
- 浏览器需支持**Media Source Extensions** 。
- 可到 [https://www.caniuse.com/#search=media%20source%20extensions](https://www.caniuse.com/#search=media%20source%20extensions) 查询浏览器对Media Source Extensions的兼容行


#### 安装教程

1.  安装<br/>
直接运行<br/>
MinisMediaServer.exe<br/>
以服务启动<br/>
ServiceInstall-MinisMediaServer.exe安装<br/>
ServiceUninstall-MinisMediaServer.exe卸载<br/>

2.  demo<br/>
把demo文件夹放到web服务器即可 

3.  授权<br/>
未授权将不定时断开数据流，打开log文件夹中的log文件，查看里面的key授权码，并加群联系申请

#### 使用说明
    	//全局设置服务地址
    	//MinisRtspPlayer.defConfig.server = "ws://192.168.1.9:10088";
    	//设置日志级别 Error(默认)、Warn、Log
    	MinisRtspPlayer.defConfig.logLevel = MinisRtspPlayer.LogLevel.Log;
    	var myPlayer = null;
    	function doPlay() {
    		var url = "rtsp://admin:admin@192.168.3.65:554/h264/ch33/main/av_stream";
    		myPlayer = videojs(document.querySelector("#v1"), {
    			//独立设置服务地址
    			minisRtspPlayerConfig : {
    				server : "ws://127.0.0.1:10088"
    			},
    			controls:true, 
    			controlBar: {			
    				playToggle : false,
    				progressControl : true,
    				audioTrackButton : false,
    				liveDisplay : false
    			}
    		});
    		myPlayer.play();
    	}

#### 联系我们
商务合作QQ1：632731369<br/>
商务合作QQ2：35225817<br/>
qq群（MiniWebRTSP技术交流群1，已满）：754701345<br/>
qq群（MiniWebRTSP技术交流群2，已满）：1016354543<br/>
qq群（MiniWebRTSP技术交流群3）：734769486<br/>
