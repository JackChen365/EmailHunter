const STATE={
    request:{
        ADD_EMAIL:0,
        ADD_EMAIL_SUB:1,
        ADD_URL:2,
        URL_START:3,
        URL_FINISH:4,
        URL_ALL_FINISH:5,
        COPY_TEXT:6,
        FINISH:7,
    },
    response:{
        URL:10,
        URL_MORE:11,
        COPY_TEXT:12,
        FINISH:13,
    }
}

function httpRequest(url, callback){
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            callback(xhr.responseText);
        }
    }
    xhr.send();
}

function htmlToDoc(markup) {
    var parser = new DOMParser();
    return parser.parseFromString(markup, "text/html");
}

//请求一个网页
function requestHtml(emailDict, urlCache,urlArray, host_url, url, deep){
    // start request
    console.info(url)
    chrome.runtime.sendMessage(JSON.stringify(
        {"state":STATE.request.URL_START,"data":{"total":urlCache.length,"size":urlArray.length,"url":url}}));
    httpRequest(url, function(htmlSource){
        var r;
        const EMAIL_ADDRESS=/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        while(r=EMAIL_ADDRESS.exec(htmlSource)){
            let email=r[1]
            let findItems=Object.keys(emailDict).filter(k => k==email);
            let email_count=null!=emailDict[email]?emailDict[email].length:0
            if(0 == findItems.length){
                emailDict[email]=[url]
                chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.ADD_EMAIL, "email":email,"data":emailDict[email]}));
            } else if(!emailDict[email].some(e => e === url)){
                emailDict[email].push(url);
            }
            if(email_count!=emailDict[email].length){
                chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.ADD_SUB, "email":email,"data":url}));
            }
        }
        //以下链接将被过滤
        //chrome-extension:
        //javascript:
        var htmlDoc = htmlToDoc(htmlSource);
        let findCollections = htmlDoc.getElementsByTagName("a");
        const eleArray = Array.prototype.slice.call(findCollections)
        const linkArray=eleArray.filter(function (element) {
            return element.href!=null&&element.href!=''&&
            !element.href.startsWith("chrome-extension:")&&
            !element.href.startsWith("javascript:")&&
            element.href.startsWith(host_url)
        })
        linkArray.map(item => item.href).forEach(function(item){
            if(!urlCache.some(e => e === item)){
                urlArray.push(item)
                urlCache.push(item)
                chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.ADD_URL, "data":item}));
            }
        });
        chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.URL_FINISH,"data":url}));
        //current page finished
        if(!deep){
            let tempDict={"state":STATE.request.FINISH,"data":{"total":urlCache.length,"size":urlArray.length,"url":url}}
            chrome.runtime.sendMessage(JSON.stringify(tempDict));    
        } else {
            if(!taskRunning){
                clearRequestInfo();
                console.info("task is stop!")
            } else {
                if(0 == urlArray.length){
                    chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.URL_ALL_FINISH}));
                } else {
                    let requestUrl=urlArray.shift()
                    console.info(requestUrl)
                    requestHtml(emailDict, urlCache, urlArray, host_url, requestUrl, deep)
                }
            }
        }
    });
}
var currentUrl;
var emailDict = {};
var urlCache = new Array()
var urlArray = new Array();
var taskRunning=false;

function clearRequestInfo(){
    emailDict = {};
    urlCache = new Array();
    urlArray = new Array();
}

function requestUrl(result_item){
    let URL_ADDRESS=/(https?:\/\/[^\s\/]+)\/?/gi;
    let url_addresses=URL_ADDRESS.exec(result_item.data);
    if(null!=url_addresses){        
        clearRequestInfo();
        currentUrl=result_item.data
        urlCache.push(result_item.data)
        const url_address = url_addresses[0];
        //add url item
        chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.ADD_URL, "data":result_item.data}));
        requestHtml(emailDict,urlCache,urlArray,url_address,result_item.data,false)
    }
}

function requestUrlDeep(){
    if(null!=currentUrl){
        let URL_ADDRESS=/(https?:\/\/[^\s\/]+)\/?/gi;
        let url_addresses=URL_ADDRESS.exec(currentUrl);
        if(null!=url_addresses){        
            //set flag is true
            taskRunning=true;
            const url_address = url_addresses[0];
            //开始请求
            requestHtml(emailDict,urlCache,urlArray,url_address,currentUrl,true)
        }
    }
}
chrome.runtime.onMessage.addListener(function(data, sender, sendResponse){
    var result_item = JSON.parse(data);
    if(STATE.response.URL==result_item.state){
        requestUrl(result_item)
    } else if(STATE.response.URL_MORE==result_item.state){
        requestUrlDeep()
    } else if(STATE.response.COPY_TEXT==result_item.state){
        var output=""
        Object.keys(emailDict).forEach(function(email){
            output+=email+'\n'
        });
        chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.COPY_TEXT, "data":output}));
    }
});
//popup window close event
chrome.runtime.onConnect.addListener(function (externalPort) {
    externalPort.onDisconnect.addListener(function() {
        currentUrl = null;
        taskRunning=false;
    });
});