var tabResults = {};
var tabsWindows = {};
var lastTabId = null;
var extensionStatus = true;
// console.log('PGAI-EXT-BACKGROUND: loaded ');
// listen for our browerAction to be clicked
chrome.browserAction.onClicked.addListener(function (tab) {
  // console.log('PGAI-EXT-BACKGROUND: sent toggle configtest ');
  chrome.tabs.sendMessage(tab.id, {message: 'toggle-configtest'});
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  lastTabId = activeInfo.tabId;
  tabsWindows[activeInfo.tabId] = activeInfo.windowId;
  updateTabResult(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener(function(tabId,removeInfo) {
  if(tabResults[tabId]){
    tabResults[tabId] = undefined;
    tabsWindows[tabId] = undefined;
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  //console.log('tabs updated:',tabId,changeInfo);
  if(changeInfo.status && changeInfo.status === 'loading'){
    if(tabResults[tabId]) tabResults[tabId] = undefined;
    tabsWindows[tabId] = undefined;
    updateTabResult(tabId);
  }
});

chrome.tabs.onCreated.addListener(function(tab) {
  updateTabResult(tab.id);
});

chrome.runtime.onStartup.addListener(function(tab) {
  chrome.storage.sync.get(['isExtEnabled'], function(data) {
    extensionStatus = typeof data['isExtEnabled'] === 'undefined' ? true : data['isExtEnabled'];
  })
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // console.log('PGAI-EXT-BACKGROUND: got message ', message, sender);

  // get extension status
  if(message && message.action && message.action === 'get-ext-email'){
    chrome.storage.sync.get(['userEmail'], function(items) {
      // console.log('PGAI-EXT-BACKGROUND: Settings retrieved', items);
      chrome.tabs.sendMessage(sender.tab.id, {message: 'email-from-ext',value: items['userEmail']});
    });
  }

  // set extension status
  if(message && message.action && message.action === 'set-ext-email'){
    chrome.storage.sync.set({'userEmail':message.email}, function() {
      // console.log('PGAI-EXT-BACKGROUND: Settings saved', message);
    });
  }

  // delete extension email
  if(message && message.action && message.action === 'delete-ext-email'){
    chrome.storage.sync.remove('userEmail', function() {
      // console.log('PGAI-EXT-BACKGROUND: Settings saved, deleted email from cookie', message);
    });
  }

  // set configtest-results for specific tab
	if(message && message.action && message.action === 'configtest-result'){
    tabResults[sender.tab.id] = { fail:message.fail, warning: message.warning, pass: message.pass };
    updateTabResult(sender.tab.id);
  }

  // set icon to disabled when pghb not found
  if(message && message.action && message.action === 'pghb-notfound'){
    updateTabResult(lastTabId);
  }

  // update tab results
  if(message && message.action && message.action === 'pghb-found'){
    updateTabResult(lastTabId);
  }

  // get the necessary data to display on extension popup
  if(message && message.action && message.action === 'popup'){
    if (extensionStatus && !tabResults[lastTabId]) {
      var needRefresh = true;
    } else {
      var needRefresh = false;
    }
    var response = {
      'logs': tabResults[lastTabId],
      'extStatus': typeof extensionStatus === 'undefined' ? true : extensionStatus,
      'needRefresh': needRefresh,
      'loadStatus': message.loadStatus
    }
    sendResponse(response);
  }

  // set extension status
  if(message && message.action && message.action === 'set-ext-status'){
    extensionStatus = message.value;
    // if (!extensionStatus) tabResults = {}; // this will erase all previous data if extension will turned off
    chrome.storage.sync.set({'isExtEnabled':message.value}, function() {
      // console.log('PGAI-EXT-BACKGROUND: Settings for extension status saved', message);
    });
    updateTabResult(lastTabId);
  }

  // get extension status
  if(message && message.action && message.action === 'get-ext-status'){
    chrome.storage.sync.get(['isExtEnabled'], function(data) {
      // extensionStatus = data['isExtEnabled'];
      // console.log('PGAI-EXT-BACKGROUND: Settings for extension status retrieved', data);
      chrome.tabs.sendMessage(sender.tab.id, {message: 'ext-status', value: data['isExtEnabled']});
    })
  }

  // remove log results if extension is turned of and refreshed
  if(message && message.action && message.action === 'remove-results'){
    tabResults = {};
  }
});

/**
 * Set badge data and icon
 */
function updateTabResult(tabId){
  var state = tabResults[tabId];
  // console.log('PGAI-EXT-BACKGROUND: updating tab result ', tabId, state, extensionStatus);
  if(!extensionStatus){
    chrome.browserAction.setIcon({path: 'icons/nicongrey128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[0, 0, 0, 0]});
    chrome.browserAction.setBadgeText({text: ""});
  }
  else if(!state && extensionStatus){
    chrome.browserAction.setIcon({path: 'icons/nicon128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[0, 0, 0, 0]});
    chrome.browserAction.setBadgeText({text: ""});
  }
  else if(state.fail > 0 && state.fail > 1000){
    chrome.browserAction.setIcon({path: 'icons/nicon128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[220, 0, 0, 255]});
    chrome.browserAction.setBadgeText({text: ">1K" });
  }
  else if(state.fail > 0 && state.fail  > 0){
    chrome.browserAction.setIcon({path: 'icons/nicon128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[220, 0, 0, 255]});
    chrome.browserAction.setBadgeText({text: (state.fail ) + "" });
  }
  else if(state.fail === 0 && state.warning > 1000){
    chrome.browserAction.setIcon({path: 'icons/nicon128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[244, 143, 42, 255]});
    chrome.browserAction.setBadgeText({text: ">1K" });
  }
  else if(state.fail === 0 && state.warning > 0){
    chrome.browserAction.setIcon({path: 'icons/nicon128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[244, 143, 42, 255]});
    chrome.browserAction.setBadgeText({text: (state.warning) + "" });
  }
  else{
    chrome.browserAction.setIcon({path: 'icons/nicon128.png'});
    chrome.browserAction.setBadgeBackgroundColor({color:[0, 220, 0, 255]});
    chrome.browserAction.setBadgeText({text: "OK"});
  }
}

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (message == 'version') {
      const manifest = chrome.runtime.getManifest();
      sendResponse({
        type: 'success',
        version: manifest.version
      });
      return true;
    }
  }
);

// on uninstalling extension redirect to survey page
if (chrome.runtime.setUninstallURL) {
  chrome.runtime.setUninstallURL("https://www.surveymonkey.com/r/pgai", function() {
    var lastError = chrome.runtime.lastError;
    if (lastError && lastError.message) {
      console.warn("Unable to set uninstall URL: " + lastError.message);
    }
  });
}
