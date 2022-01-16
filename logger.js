const fs = require('fs').promises;
const { resolve } = require('path');
let isDebug = false;

exports.debug = async (...args) => {
    if (isDebug) {
        await fs.appendFile(resolve(__dirname, './debug.log'), `${JSON.stringify(args)}\n`);
    }
};