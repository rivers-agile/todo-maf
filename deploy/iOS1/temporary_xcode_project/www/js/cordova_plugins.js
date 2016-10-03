cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/cordova-plugin-globalization/www/GlobalizationError.js",
        "id": "cordova-plugin-globalization.GlobalizationError",
        "clobbers": [
            "window.GlobalizationError"
        ]
    },
    {
        "file": "plugins/cordova-plugin-globalization/www/globalization.js",
        "id": "cordova-plugin-globalization.globalization",
        "clobbers": [
            "navigator.globalization"
        ]
    },
    {
        "file": "plugins/maf-cordova-plugin-modern-webview/src/www/ios/maf-modern-webview.js",
        "id": "maf-cordova-plugin-modern-webview.maf-modern-webview",
        "clobbers": [
            "cordova.exec"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "cordova-plugin-globalization": "1.0.1",
    "maf-cordova-plugin-modern-webview": "1.0.1",
    "maf-cordova-plugin-network-access": "1.0.0"
}
// BOTTOM OF METADATA
});