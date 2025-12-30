// console.log('PGAI-EXT == CONTENT-SCRIPT was injected');

/**
 * Event listener to communicate between configtest & extension
 */
document.addEventListener("pghb", function(ev){
  // console.log('PGAI-EXT: got a phb event from document', ev.detail, ev.detail.detail, ev.detail.action);
  if(ev.detail && ev.detail.action && ev.detail.action === 'configtest-prepared'){
    // console.log('PGAI-EXT: > configtest-prepared ');
    return;
  }
  if(ev.detail && ev.detail.detail && ev.detail.detail.action && ev.detail.detail.action === 'configtest-result'){
    // console.log('PGAI-EXT: > configtest-result > sending message to the extension from configtest')
    chrome.runtime.sendMessage(ev.detail.detail);
    chrome.runtime.sendMessage({action:'get-ext-email'});
    return;
  }
  if(ev.detail && ev.detail.action && ev.detail.action === 'pghb-found'){
    // console.log('PGAI-EXT: > pghb-found > sending message to the extension from configtest')
    chrome.runtime.sendMessage(ev.detail);
    return;
  }

  if(ev.detail && ev.detail.detail.action && ev.detail.detail.action === 'set-ext-email'){
    // console.log('PGAI-EXT: > set-ext-email > we send the email to the extension');
    chrome.runtime.sendMessage({action:'set-ext-email', 'email': ev.detail.detail.email });
    return;
  }
  if(ev.detail && ev.detail.detail.action && ev.detail.detail.action === 'delete-ext-email'){
    // console.error('PGAI-EXT: > delete-ext-email > delete email from extension if logged out');
    chrome.runtime.sendMessage({action:'delete-ext-email'});
    return;
  }
  if(ev.detail && ev.detail.detail.action && ev.detail.detail.action === 'turn-ext-off'){
    // console.log('PGAI-EXT: < turn-ext-off > Turn off extension, user asked for it (visited more than 5 domain)');
    chrome.runtime.sendMessage({action:'set-ext-status', 'value': ev.detail.detail.value});
    return;
  }
});

/**
 * Event listner for tab
 * Any message sent to tab will be checked here
 */
chrome.runtime.onMessage.addListener( function(request, sender) {
  // console.log('PGAI-EXT: got message from Extenstion', request.message);
  if(request && request.message && request.message === 'toggle-configtest'){
    window.postMessage({ type: "pghb", command: "toggle-configtest" }, "*");
  }
  if (request && request.message && request.message === 'email-from-ext') {
    // console.log('PGAI-EXT: sending email from ext to configtest', request);
    window.postMessage({ type: "pghb", command: "set-email-from-ext", "email": request.value }, "*");
  }
  if (request && request.message && request.message === 'refresh') {
    if (!!request.removeDebugWindowOnly) {
      var debugeWindow = document.querySelector('#m2debug');
      if (debugeWindow) {
        if ((document.querySelector('#m2debug .m2debug-show-overlay-checkbox') !== null) && (document.querySelector('#m2debug .m2debug-show-overlay-checkbox').checked)) {
          document.querySelector('#m2debug .m2debug-show-overlay-checkbox').click();
        }
        debugeWindow.style.display = 'none';
        debugeWindow.setAttribute('data-closed', 'true');
      }
    } else {
      console.log("REFRESHEING");
      window.location.reload();
    }
  }
  if (request && request.message && request.message === 'ext-status') {
    var isExtEnabled = request.value;
    if (typeof isExtEnabled === 'undefined' || isExtEnabled === true) {
      var restrictedDomains = [
        'dash.pubguru.com',
        'tools.monetizemore.com',
        'admanager.google.com', // kept this seperate from 'google.' only because one can get idea that admanager set as restricted for pgai
        'google.' // just to restrict configtest on google homepage or any of google page (only 'google.' as url can vary with country)
      ];
      if (!restrictedDomains.some(e => window.location.hostname.includes(e))) {
        loadPgai();
      }
    }
  }
});

// console.log('Checking extension status');
chrome.runtime.sendMessage({action:'get-ext-status'});

function loadPgai() {
  // console.log('PGAI-EXT == TELLING THE EXTENSION THAT NO ADTECH WAS FOUND FOR NOW');
  chrome.runtime.sendMessage({ action: 'pghb-notfound' });
  /**********

  //
  // Minified in: https://babeljs.io/repl/
  //

  window._pghbCheck=function(){
    var f = function () {
      var iframe = document.createElement("iframe");
      iframe.style.display = 'none';
      iframe.src = 'https://m2d.m2.ai/cookies.html';
      iframe.onload = function loadedIframe() {
        // set the property indicating that iframe is successfully loaded
        if(typeof m2hb !== 'undefined') {
          m2hb.iframeLoaded = true;
        }
      };
      document.body.appendChild(iframe);
    }
    var i,j,k,t,x,w;i=0;k=false;
    var q=function(){
      if(typeof m2hb !== 'undefined'){
        //console.error('loading from m2hb');
        m2hb.FLAG_IS_PGAI_EXTENSION_INSTALLED = true;
        m2hb.loadJS('//m2hb.s3.amazonaws.com/configtest.js');
        // f();
      }else{
        // console.error('loading from s3');
        (function() {
          window.m2hb = window.m2hb || {};
          m2hb.FLAG_IS_PGAI_EXTENSION_INSTALLED = true;
          var script = document.createElement("script");
          script.async = true;
          script.type = "text/javascript";
          var useSSL = 'https:' == document.location.protocol;
          script.src = (useSSL ? 'https:' : 'http:') + '//m2hb.s3.amazonaws.com/configtest.js';
          var target = document.getElementsByTagName("head")[0];
          target.insertBefore(script, target.firstChild);
          // f();
        })();
      }
      if(CustomEvent){
        document.dispatchEvent(new CustomEvent('pghb',{detail:{action:'configtest-prepared'}}));
      }
    }
    var c=function(){ t=setTimeout(function(){ q();  },10000); };
    j=setInterval(()=>{
      i+=100;
      if (i>3000) {
        clearInterval(j);
        q();
        return;
      }
      //console.log(i);
      if((typeof window.m2hb !== 'undefined' && window.m2hb.adUnits) || (typeof window.pghb !== 'undefined' && window.pghb.adUnits) || (typeof window.pbjs !== 'undefined' && window.pbjs.adUnits && typeof window.pbjs.setTargetingForGPTAsync !== 'undefined') || (typeof googletag !== 'undefined' && typeof googletag.pubads === 'function' && typeof googletag.defineSlot === 'function' && typeof googletag.display === 'function')){
        //console.log('found '+((typeof m2hb!='undefined')?'m2hb':((typeof pghb!='undefined')?'prebid':((typeof googletag!='undefined')?'dfp':'none')))+',preparing timeout');
        clearInterval(j);
        c();
        document.dispatchEvent(new CustomEvent('pghb',{detail:{action:'pghb-found'}}));
        typeof googletag !== 'undefined' && googletag.cmd.push(function(){
          googletag.pubads().addEventListener('slotRenderEnded',(event)=>{
            if(!k){
              //console.log('m2hb, first time, loadJS');
              clearTimeout(t);
              k=true;
              q();
            }
          });
        });
        typeof googletag === 'undefined' && q();
      };
    },100);
  };
  window._pghbCheck();
  */

  // configtest.js
  var injectCheck = "window._pghbCheck=function(){var b,d,e,g;b=0,e=!1;var m=function(){'undefined'==typeof m2hb?function(){window.m2hb=window.m2hb||{},m2hb.FLAG_IS_PGAI_EXTENSION_INSTALLED=!0;var o=document.createElement('script');o.async=!0,o.type='text/javascript';var p='https:'==document.location.protocol;o.src=(p?'https:':'http:')+'//m2hb.s3.amazonaws.com/configtest.js';var r=document.getElementsByTagName('head')[0];r.insertBefore(o,r.firstChild)}():(m2hb.FLAG_IS_PGAI_EXTENSION_INSTALLED=!0,m2hb.loadJS('//m2hb.s3.amazonaws.com/configtest.js')),CustomEvent&&document.dispatchEvent(new CustomEvent('pghb',{detail:{action:'configtest-prepared'}}))},n=function(){g=setTimeout(function(){m()},1e4)};d=setInterval(function(){return(b+=100,3e3<b)?(clearInterval(d),void m()):void(('undefined'!=typeof window.m2hb&&window.m2hb.adUnits||'undefined'!=typeof window.pghb&&window.pghb.adUnits||'undefined'!=typeof window.pbjs&&window.pbjs.adUnits&&'undefined'!=typeof window.pbjs.setTargetingForGPTAsync||'undefined'!=typeof googletag&&'function'==typeof googletag.pubads&&'function'==typeof googletag.defineSlot&&'function'==typeof googletag.display)&&(clearInterval(d),n(),document.dispatchEvent(new CustomEvent('pghb',{detail:{action:'pghb-found'}})),'undefined'!=typeof googletag&&googletag.cmd.push(function(){googletag.pubads().addEventListener('slotRenderEnded',function(){e||(clearTimeout(g),e=!0,m())})}),'undefined'==typeof googletag&&m()))},100)},window._pghbCheck();";

  window.location = "javascript:" + injectCheck;
}