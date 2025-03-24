// Create and show modal dialog
function showModal(message, type) {
  try {
    // Remove existing modal if any
    const existingModal = document.getElementById('odoo-debug-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'odoo-debug-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      width: 90%;
      color: #333;
    `;

    // Add message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin-bottom: 20px;
      color: #333;
      font-size: 16px;
      line-height: 1.4;
    `;
    content.appendChild(messageEl);

    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    `;

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      color: #333;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelButton.onclick = () => {
      modal.remove();
    };

    // OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #875A7B;
      color: white;
      cursor: pointer;
      font-size: 14px;
    `;
    okButton.onclick = () => {
      try {
        chrome.runtime.sendMessage({
          action: 'modalResponse',
          type: type
        });
      } catch (error) {
        console.error('Error sending response:', error);
      }
      modal.remove();
    };

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(okButton);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Error showing modal:', error);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'showModal') {
      showModal(message.message, message.type);
      // Send response to indicate we received the message
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  // Return true to indicate we will send a response asynchronously
  return true;
}); 