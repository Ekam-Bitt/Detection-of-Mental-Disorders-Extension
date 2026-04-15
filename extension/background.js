chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query(
    {
      url: [
        '*://*.youtube.com/*',
        '*://*.twitter.com/*',
        '*://*.x.com/*',
        '*://*.reddit.com/*',
      ],
    },
    (tabs) => {
      for (const tab of tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      }
    }
  );
});
