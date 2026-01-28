// background.js

const DEBUG_PARAM = 'debug=1';
const ODOO_URL_REGEX = /^https?:\/\/([a-z0-9-]+\.)*odoo\.com(\/odoo|\/web|\/web\/app)/i;

// Icons as data URLs (you can replace these with actual icon paths)
const icons = {
  present: {
    16: 'icons/icon_present_16.png',
    32: 'icons/icon_present_32.png',
    48: 'icons/icon_present_48.png',
    128: 'icons/icon_present_128.png'
  },
  absent: {
    16: 'icons/icon_absent_16.png',
    32: 'icons/icon_absent_32.png',
    48: 'icons/icon_absent_48.png',
    128: 'icons/icon_absent_128.png'
  }
};

/**
 * Get the list of custom URLs from storage
 * @returns {Promise<string[]>}
 */
async function getCustomUrls() {
  const result = await chrome.storage.sync.get('customUrls');
  return result.customUrls || [];
}

/**
 * Add a URL to the custom URLs list
 * @param {string} url 
 */
async function addCustomUrl(url) {
  const customUrls = await getCustomUrls();
  const baseUrl = getOdooInstanceBaseUrl(url);
  
  if (!customUrls.includes(baseUrl)) {
    customUrls.push(baseUrl);
    await chrome.storage.sync.set({ customUrls });
  }
}

/**
 * Remove a URL from the custom URLs list
 * @param {string} url 
 */
async function removeCustomUrl(url) {
  const customUrls = await getCustomUrls();
  const baseUrl = getOdooInstanceBaseUrl(url);
  
  const index = customUrls.indexOf(baseUrl);
  if (index > -1) {
    customUrls.splice(index, 1);
    await chrome.storage.sync.set({ customUrls });
  }
}

/**
 * Checks if the URL matches any Odoo domain pattern or custom URL.
 * @param {string} url 
 * @returns {Promise<boolean>}
 */
async function isOdooWebURL(url) {
  if (ODOO_URL_REGEX.test(url)) {
    return true;
  }

  const customUrls = await getCustomUrls();
  const baseUrl = getOdooInstanceBaseUrl(url);
  return customUrls.some(customUrl => baseUrl === customUrl);
}

/**
 * Checks if the URL is using the new Odoo 18 pattern.
 * @param {URL} urlObj 
 * @returns {boolean}
 */
function isOdoo18Pattern(urlObj) {
  return urlObj.pathname.startsWith('/odoo');
}

/**
 * Gets the normalized base URL for an Odoo instance.
 * This ensures all pages within the same Odoo instance share the same preference.
 * @param {string} url 
 * @returns {string} The normalized base URL
 */
function getOdooInstanceBaseUrl(url) {
  const urlObj = new URL(url);
  const origin = urlObj.origin;
  const pathname = urlObj.pathname;
  
  // For Odoo 19 URLs with /odoo/* pattern
  if (pathname.startsWith('/odoo/') || pathname === '/odoo') {
    return `${origin}/odoo`;
  }
  
  // For URLs with /web/* pattern
  if (pathname.startsWith('/web/') || pathname === '/web') {
    return `${origin}/web`;
  }
  
  // For custom URLs or other patterns, use origin + pathname as before
  return origin + pathname;
}

/**
 * Checks if the debug parameter is present in the URL.
 * @param {URL} urlObj 
 * @returns {boolean}
 */
function hasDebugParam(urlObj) {
  // Check both hash parameters and search parameters for debug mode
  const searchDebug = urlObj.searchParams.has('debug');
  const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
  const hashDebug = hashParams.has('debug');
  return searchDebug || hashDebug;
}

/**
 * Appends the debug parameter to the URL appropriately.
 * @param {URL} urlObj 
 * @returns {string} New URL with debug parameter
 */
function appendDebugParam(urlObj) {
  // First remove any existing debug parameters
  urlObj.searchParams.delete('debug');
  const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
  hashParams.delete('debug');
  urlObj.hash = hashParams.toString();

  // Then add the debug parameter to search params
  if (urlObj.search) {
    urlObj.search += `&${DEBUG_PARAM}`;
  } else {
    urlObj.search = `?${DEBUG_PARAM}`;
  }
  return urlObj.toString();
}

/**
 * Updates the extension icon based on the presence of the debug parameter.
 * @param {chrome.tabs.Tab} tab 
 * @param {boolean} debugPresent 
 */
function updateIcon(tab, debugPresent) {
  const newIcon = debugPresent ? icons.present : icons.absent;
  chrome.action.setIcon({
    tabId: tab.id,
    path: newIcon
  });
}

/**
 * Handles tab updates.
 * @param {number} tabId 
 * @param {chrome.tabs.TabChangeInfo} changeInfo 
 * @param {chrome.tabs.Tab} tab 
 */
async function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.url) {
    processTab(tab);
  } else if (changeInfo.status === 'complete') {
    processTab(tab);
  }
}

/**
 * Get the list of URLs where auto-debug is disabled
 * @returns {Promise<string[]>}
 */
async function getDisabledAutoDebugUrls() {
  const result = await chrome.storage.sync.get('disabledAutoDebugUrls');
  return result.disabledAutoDebugUrls || [];
}

/**
 * Add a URL to the disabled auto-debug list
 * @param {string} url 
 */
async function disableAutoDebug(url) {
  const disabledUrls = await getDisabledAutoDebugUrls();
  const baseUrl = getOdooInstanceBaseUrl(url);
  
  if (!disabledUrls.includes(baseUrl)) {
    disabledUrls.push(baseUrl);
    await chrome.storage.sync.set({ disabledAutoDebugUrls: disabledUrls });
  }
}

/**
 * Remove a URL from the disabled auto-debug list
 * @param {string} url 
 */
async function enableAutoDebug(url) {
  const disabledUrls = await getDisabledAutoDebugUrls();
  const baseUrl = getOdooInstanceBaseUrl(url);
  
  const index = disabledUrls.indexOf(baseUrl);
  if (index > -1) {
    disabledUrls.splice(index, 1);
    await chrome.storage.sync.set({ disabledAutoDebugUrls: disabledUrls });
  }
}

/**
 * Check if auto-debug is disabled for a URL
 * @param {string} url 
 * @returns {Promise<boolean>}
 */
async function isAutoDebugDisabled(url) {
  const disabledUrls = await getDisabledAutoDebugUrls();
  const baseUrl = getOdooInstanceBaseUrl(url);
  return disabledUrls.includes(baseUrl);
}

/**
 * Handle extension icon click
 * @param {chrome.tabs.Tab} tab 
 */
async function handleIconClick(tab) {
  if (!tab.url) return;

  try {
    const urlObj = new URL(tab.url);
    const baseUrl = getOdooInstanceBaseUrl(tab.url);
    const customUrls = await getCustomUrls();
    const isDisabled = await isAutoDebugDisabled(tab.url);
    const hasDebug = hasDebugParam(urlObj);
    
    // Always inject the content script first
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      console.error('Error injecting content script:', error);
      return;
    }

    if (customUrls.includes(baseUrl)) {
      // Show disable dialog for custom URLs
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showModal',
          type: 'removeCustom',
          message: 'Disable auto debug for this page?'
        });
      } catch (error) {
        console.error('Error sending message to content script:', error);
      }
    } else if (!ODOO_URL_REGEX.test(tab.url)) {
      // Show enable dialog for non-Odoo URLs
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showModal',
          type: 'addCustom',
          message: 'Enable auto debug for this page?'
        });
      } catch (error) {
        console.error('Error sending message to content script:', error);
      }
    } else {
      // Show enable/disable dialog for Odoo URLs
      try {
        if (isDisabled) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showModal',
            type: 'enable',
            message: 'Enable auto debug for this page?'
          });
        } else if (hasDebug) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showModal',
            type: 'disable',
            message: 'Disable auto debug for this page?'
          });
        }
      } catch (error) {
        console.error('Error sending message to content script:', error);
      }
    }
  } catch (error) {
    console.error('Error handling icon click:', error);
  }
}

/**
 * Processes a tab to check and modify the URL if necessary.
 * @param {chrome.tabs.Tab} tab 
 */
async function processTab(tab) {
  if (!tab.url || !(await isOdooWebURL(tab.url))) {
    // Not an Odoo URL or custom URL; set icon to absent
    updateIcon(tab, false);
    return;
  }

  try {
    const urlObj = new URL(tab.url);
    const debugPresent = hasDebugParam(urlObj);
    const isDisabled = await isAutoDebugDisabled(tab.url);

    // Update the icon based on debug parameter
    updateIcon(tab, debugPresent);

    // Skip auto debug for editor pages
    const isEditorPage = urlObj.pathname.includes('/editor/');

    if (!debugPresent && !isDisabled && !isEditorPage) {
      // Append debug parameter and reload the tab
      const newURL = appendDebugParam(urlObj);
      chrome.tabs.update(tab.id, { url: newURL });
    }
  } catch (error) {
    console.error('Error processing tab:', error);
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(handleTabUpdate);

// Listen for tab activation to process the active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  processTab(tab);
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(handleIconClick);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'modalResponse') {
    const tab = sender.tab;
    if (!tab) return;

    if (message.type === 'enable') {
      enableAutoDebug(tab.url).then(() => {
        const urlObj = new URL(tab.url);
        const newURL = appendDebugParam(urlObj);
        chrome.tabs.update(tab.id, { url: newURL });
      }).catch(error => {
        console.error('Error enabling auto debug:', error);
      });
    } else if (message.type === 'disable') {
      disableAutoDebug(tab.url).then(() => {
        const urlObj = new URL(tab.url);
        urlObj.searchParams.delete('debug');
        chrome.tabs.update(tab.id, { url: urlObj.toString() });
      }).catch(error => {
        console.error('Error disabling auto debug:', error);
      });
    } else if (message.type === 'addCustom') {
      addCustomUrl(tab.url).then(() => {
        const urlObj = new URL(tab.url);
        const newURL = appendDebugParam(urlObj);
        chrome.tabs.update(tab.id, { url: newURL });
      }).catch(error => {
        console.error('Error adding custom URL:', error);
      });
    } else if (message.type === 'removeCustom') {
      removeCustomUrl(tab.url).then(() => {
        const urlObj = new URL(tab.url);
        urlObj.searchParams.delete('debug');
        chrome.tabs.update(tab.id, { url: urlObj.toString() });
        updateIcon(tab, false);
      }).catch(error => {
        console.error('Error removing custom URL:', error);
      });
    }
  }
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Initial processing for already open tabs when the extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      processTab(tab);
    });
  });
});
