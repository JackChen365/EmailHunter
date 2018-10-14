const STATE={
    request:{
        URL:10,
        URL_MORE:11,
        COPY_TEXT:12,
        FINISH:13,
    },
    response:{
        ADD_EMAIL:0,
        ADD_EMAIL_SUB:1,
        ADD_URL:2,
        URL_START:3,
        URL_FINISH:4,
        URL_ALL_FINISH:5,
        COPY_TEXT:6,
        FINISH:7,
    }
}
//start a connect
var port = chrome.runtime.connect()

function hashCode(s) {
    if(s==null){
        return -1;
    } else {
        for(var i = 0, h = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
        return h;
    }
}

function item_source_event(source_id){
    let sub_eles = document.getElementsByClassName(source_id);
    for(let i=0;i<sub_eles.length;i++){
        if(sub_eles[i].style.display=="none"){
            sub_eles[i].style.display="table-row";
        } else {
            sub_eles[i].style.display="none";
        }
    }
}
// add a list item
function add_list_item(result_item){
    
    let result_body=document.getElementById("hunter-result-body");
    if(null!=result_item&&null!=result_body){
        // current count
        $("#result-count").html(`${$(".hunter-list-item").length+1}`);
        let list_id="hunter-list-"+hashCode(result_item.email);
        let list_source_id=list_id+"-source"
        let list_source_sub_class=list_id+"-sub"
        //all source item
        let list_item = document.getElementById(list_id)
        if(null==list_item){
            var tempElement = document.createElement('tr');
            tempElement.setAttribute("id", list_id);
            tempElement.setAttribute("class", "hunter-list-item");
            tempElement.innerHTML = 
            `<td class=\"mdl-data-table__cell--non-numeric\">${result_item.email}</td>`+                   
            `<td style=\"text-align:center\">${result_item.data.length}</td>`+
            `<td><button id=\"${list_source_id}\" class=\"mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect\">`+
                `<img src=\"image/ic_more_vert.png\"/>`+
            `</button></td>`;
            result_body.appendChild(tempElement);
            //set item source click event
            $(`#${list_source_id}`).click(function(){item_source_event(list_source_sub_class)})
        }
    } else {
        console.info("#")
    }
}
// add a list sub item
function add_list_sub_item(result_item){
    let result_body=document.getElementById("hunter-result-body");
    if(null!=result_item&&null!=result_body){
        // current count
        $("#result-count").val(`${$(".hunter-list-item").length}`)
        let list_id="hunter-list-"+hashCode(result_item.email);
        let list_sub_class=list_id+"-sub"
        //all source item
        let list_item = document.getElementById(list_id)
        let list_sub_item = document.getElementsByClassName(list_sub_class)
        var tempElement = document.createElement('tr');
        tempElement.setAttribute("class", list_sub_class);
        tempElement.style.display="none"
        tempElement.innerHTML = 
        `<td colspan="3" class=\"hunter-result-table-sub resumdl-data-table__cell--non-numeric\">${result_item.data}</td>`;
        if(null==list_sub_item){
            result_body.insertBefore(tempElement,list_item);
        } else {
            result_body.insertBefore(tempElement, list_sub_item[list_sub_item.length-1]);
        }
    } else {
        console.info("#")
    }
}

function add_list_url_item(result_item){
    let result_body=document.getElementById("hunter-url-body");
    var tempElement = document.createElement('tr');
    let sub_id = hashCode(result_item.data)+"-sub"
    tempElement.setAttribute("id", hashCode(result_item.data));
    tempElement.innerHTML = 
        `<td class="mdl-data-table__cell--non-numeric">${result_item.data}</td>
        <td><div id="${sub_id}" class="spinner" role="progressbar" aria-valuetext="Loading…"></div></td>`;
    result_body.appendChild(tempElement);
    $(`#${sub_id}`).hide()
}

function list_url_item_start(result_item){
    console.info("url-start:"+result_item.data.url)
    $("#url-request-info").html("Total:"+result_item.data.total+" Queue:"+result_item.data.size+" "+result_item.data.url)
    let list_id=hashCode(result_item.data.url)
    let sub_id=list_id+"-sub";
    $(`#${sub_id}`).show()
    //auto scroll to row
    $('.hunter-url-table').scrollTop($(`#${list_id}`)[0].offsetTop);
}

function list_url_item_finish(result_item){
    console.info("url-finish:"+result_item.data)
    let list_id=hashCode(result_item.data)+"-sub";
    $(`#${list_id}`).hide()
}

function list_url_item_all_finish(result_item){
    $("#hunter-title-spinner").hide();
    $("#hunter-request-spinner").hide();
}
function copyToClipboard(text) {
    const input = document.createElement('textarea');
    input.style.position = 'fixed';
    input.style.opacity = 0;
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('Copy');
    document.body.removeChild(input);
  };

function exportText(text){
    // Save as file
    // var url = 'data:application/txt;base64,' + text;
    // chrome.downloads.download({
    //     url: url,
    //     filename: 'email.txt'
    // });
    let link=document.getElementById("action-button-copy")
    link.download = "file.txt";
    link.href = `data:text/txt,${text}\n`
    link.click();
}

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    let tab_url = tabs[0].url;
    chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.URL, "data":tab_url}));
});
chrome.runtime.onMessage.addListener(function(data, sender, sendResponse){
    var result_item = JSON.parse(data);
    if(STATE.response.ADD_EMAIL==result_item.state){
        add_list_item(result_item)
    } else if(STATE.response.ADD_EMAIL_SUB==result_item.state){
        add_list_sub_item(result_item)
    } else if(STATE.response.ADD_URL==result_item.state){
        add_list_url_item(result_item)   
    } else if(STATE.response.URL_START==result_item.state){
        list_url_item_start(result_item)   
    } else if(STATE.response.URL_FINISH==result_item.state){
        list_url_item_finish(result_item)   
    } else if(STATE.response.URL_ALL_FINISH==result_item.state){
        list_url_item_all_finish(result_item)   
    } else if(STATE.response.COPY_TEXT==result_item.state){
        copyToClipboard(result_item.data)
        // exportText(result_item.data)
    } else if(STATE.response.FINISH==result_item.state){
        $("#hunter-title-spinner").hide();
        $("#hunter-request-spinner").hide();
        $("#url-request-info").html("Total:"+result_item.data.total+" Queue:"+result_item.data.size)
    }
}); 
$("#hunter-button-more").click(function(){
    $("#hunter-title-spinner").toggle();
    $("#hunter-request-spinner").show("slow");
    $("#hunter-button-more").prop( "disabled", true);
    chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.URL_MORE}));
})

$("#hunter-button-copy").click(function(){
    chrome.runtime.sendMessage(JSON.stringify({"state":STATE.request.COPY_TEXT}));
})