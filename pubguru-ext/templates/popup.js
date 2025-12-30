/**
 * Turn on/off extension
 */
document.addEventListener('DOMContentLoaded', function(){
  if (document.querySelectorAll('.m2d-adoverlay-toggle')) {
    document.querySelectorAll('.m2d-adoverlay-toggle').forEach(function(e) {
      e.addEventListener('click', function (ev) {
        var el = ev.currentTarget;
        if (el.classList.contains('m2d-adoverlay-toggle-off')) {
          chrome.runtime.sendMessage({action:'set-ext-status', 'value': true}); // set cookie: "isExtEnabled: true"
          setDOMInfo({extStatus:true});
        } else if (el.classList.contains('m2d-adoverlay-toggle-on')) {
          chrome.runtime.sendMessage({action:'set-ext-status', 'value': false});  // set cookie: "isExtEnabled: false"
          setDOMInfo({extStatus:false});
        }
        enableRefresh();
      });
    })
  }

  /**
   * This needs to be implemented
   * If clicked on any log numbers, it should show logs window with specific results (error/warning/pass)
   */
  if (document.querySelectorAll('.logs')) {
    document.querySelectorAll('.logs').forEach(function(e) {
      e.addEventListener('click', function (ev) {
        var logEl = ev.currentTarget.querySelector('span').className;
        if (logEl === 'log-error') {
          chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            // console.log(tabs[0].id);
            chrome.tabs.sendMessage(tabs[0].id, {message: 'log-view', type: 'error'});
          })
        } else if (logEl === 'log-warning') {
          chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            // console.log(tabs[0].id);
            chrome.tabs.sendMessage(tabs[0].id, {message: 'log-view', type: 'warning'});
          })
        } else if (logEl === 'log-pass') {
          chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            // console.log(tabs[0].id);
            chrome.tabs.sendMessage(tabs[0].id, {message: 'log-view', type: 'pass'});
          })
        }
      })
    })
  }

  /**
   * Refresh page when extension status is toggled
   * IF: extension is off remove m2debug window from non-active tabs & refresh current tab
   * ELSE: extension is on, refresh page to load test results
   */
  if (document.querySelector('#refreshButton')) {
    document.querySelector('#refreshButton').addEventListener('click', function(e) {
      if (document.querySelector('.m2d-adoverlay-toggle').classList.contains('m2d-adoverlay-toggle-off')) {
        removeDebugWindow();
      } else {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {message: 'refresh'}, function(data){
            window.close();
          });
        })
      }
    });
  }

  /**
   * Get Data when popup (extension icon) clicked
   */
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.runtime.sendMessage({action:'popup', loadStatus: tabs[0].status}, setDOMInfo);
  });

  /**
   * Remove debug window from all tabs
   */
  function removeDebugWindow() {
    chrome.tabs.query({}, function(e) {
      for (var i=0; i<e.length; i++) {
        var messageData = {message: 'refresh'}
        if (!e[i].active && !e[i].selected) {
          messageData['removeDebugWindowOnly'] = true;
        }
        chrome.tabs.sendMessage(e[i].id, messageData);
      }
      chrome.runtime.sendMessage({action: 'remove-results'})
      window.close();
    });
  }
  /**
   * Enable refesh button
   */
  function enableRefresh() {
    var refresh = document.querySelector('.refreshDiv')
    refresh.style.display = 'block';
    window.setTimeout(function(){
      refresh.style.opacity = 1;
      refresh.style.transform = 'scale(1)';
    },0);
  }
  /**
   * Set log numbers and other text dynamically
   */
  function setDOMInfo(data){
    // console.error(data);

    try {
      // if extension is turned on from another tab then show refresh button to see test result
      if (data.needRefresh && data.loadStatus === 'complete') {
        enableRefresh();
      }
      var el = document.querySelector('#forAll');
      if (data.extStatus) {
        document.querySelector('#textAll').innerHTML = 'Turn Extension Off';
        el.classList.remove('m2d-adoverlay-toggle-off');
        el.classList.add('m2d-adoverlay-toggle-on');
        if (data.logs) {
          document.querySelector('.log-data').style.display = 'block';
          document.querySelector('.error-text').innerHTML = data.logs.fail;
          document.querySelector('.warning-text').innerHTML = data.logs.warning;
          document.querySelector('.pass-text').innerHTML = data.logs.pass;
        }
      } else {
        document.querySelector('#textAll').innerHTML = 'Turn Extension On';
        el.classList.remove('m2d-adoverlay-toggle-on');
        el.classList.add('m2d-adoverlay-toggle-off');
      }
    } catch (e) {
      console.error('Error while setting dom info: ', e);
    }
  }
})