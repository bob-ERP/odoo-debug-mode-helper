# Odoo Debug Mode Helper

A Chrome extension that automatically enables debug mode for Odoo instances and provides an easy way to manage debug mode settings.

## Features

- Automatically enables debug mode for Odoo instances
- Supports both odoo.com domains and custom Odoo installations
- Visual indicator showing debug mode status
- Ability to enable/disable auto-debug mode per page
- Confirmation dialogs to prevent accidental changes
- Persists user preferences across browser sessions

## Usage

### Auto-detected Odoo URLs
- The extension automatically detects Odoo instances and enables debug mode
- Click the extension icon to:
  - Disable auto-debug mode for the current page
  - Re-enable auto-debug mode for the current page
- A confirmation dialog will appear before making any changes

### Custom URLs
- For non-odoo.com URLs, click the extension icon to:
  - Add the URL to custom URLs list and enable debug mode
  - Remove the URL from custom URLs list and disable debug mode
- A confirmation dialog will appear before making any changes

### Visual Indicators
- Green icon: Debug mode is enabled
- Gray icon: Debug mode is disabled

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Development

The extension is built using vanilla JavaScript and Chrome Extension APIs. The main components are:

- `background.js`: Handles URL processing, debug mode toggling, and extension state
- `content.js`: Manages the confirmation dialogs
- `manifest.json`: Extension configuration and permissions

## License

MIT License 