#!/usr/bin/node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const { dirname, resolve } = require('path');
const { debug } = require('./logger.js');

/**
 * @param {string} path 
 * @returns {Promise<boolean>}
 */
async function exists(path) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * @param {string} configFileName
 * @returns {Promise<[object, string]>}
 */
async function getConfig(configFileName) {
    let configDir = process.cwd();
    let configFile = `${configDir}/${configFileName}`;
    while (!await exists(configFile)) {
        configDir = dirname(configDir);
        if (configDir === '/') {
            throw new Error(`Unable to find a '${configFileName}' in the directory tree`);
        }
        configFile = `${configDir}/${configFileName}`;
    }

    const configRaw = await fs.readFile(configFile);
    const config = JSON.parse(configRaw);
    return [config, configDir];
}

/**
 * @param {object} config 
 * @param {string} configDir 
 * @returns {Map<string, string>}
 */
async function getScripts(config, configDir) {
    const scriptDirs = config.scriptDirs || [];
    const scripts = new Map();
    await Promise.all(scriptDirs.map(async (scriptDir) => {
        const absoluteScriptDir = resolve(configDir, scriptDir);
        const files = await fs.readdir(absoluteScriptDir);
        for (const file of files) {
            const parts = file.split('.');
            if (parts.length > 1) {
                parts.pop();
                scripts.set(parts.join('.'), `${absoluteScriptDir}/${file}`);
            }
        }
    }));
    return scripts;
}

const completionPlugins = {
    '$$docker-compose': () => require('./plugins/docker-compose.js'),
};

function getPlugin(cfg) {
    const pluginKey = Object.keys(cfg).find((key) => completionPlugins[key]);
    return pluginKey ? [completionPlugins[pluginKey], cfg[pluginKey]] : null;
}

/**
 * @param {object} config
 * @param {string} configDir
 * @param {string[]} resolvedArgs
 * @param {string} lastArg
 * @returns {string[]}
 */
async function getCompletions(config, configDir, resolvedArgs, lastArg) {
    if (resolvedArgs.length === 0) {
        const scripts = await getScripts(config, configDir);
        return [...scripts.keys()];
    }

    let completion = config.completion || {};

    const argLength = resolvedArgs.length;
    for (let i = 0; i < argLength; i++) {
        const arg = resolvedArgs[i];
        const next = completion[arg];
        if (next) {
            const plugin = getPlugin(next);
            if (plugin) {
                return await plugin[0]()(resolvedArgs.slice(i + 1), lastArg, plugin[1], { config, configDir, allArgs: resolvedArgs });
            } else {
                completion = next;
            }
        } else {
            break;
        }
    }

    return Object.keys(completion);
}

/**
 * @returns {Promise<number>}
 */
async function run() {
    const args = process.argv.slice(2);
    const configFileName = args.shift();
    const [config, configDir] = await getConfig(configFileName);

    // await debug('run', { args, config });

    if (args[0] === '--get-completions') {
        args.shift(); //option
        args.shift(); //this script's alias name - provided by the bash completion call
        const lastIncompleteArg = args.pop(); //the last (incomplete) word (empty string)
        const completions = await getCompletions(config, configDir, args, lastIncompleteArg);
        await debug('completions', completions);
        process.stdout.write(`${completions.join(' ')}`);
        return 0;
    }

    const scriptName = args.shift();
    const scripts = await getScripts(config, configDir);
    if (scripts.has(scriptName)) {
        const scriptFile = scripts.get(scriptName);
        const child = spawn(scriptFile, args, { stdio: 'inherit' });
        return new Promise((resolve) => child.on('close', resolve));
    }

    process.stderr.write(`Script '${scriptName}' not found\n`);
    return 1;
}

function fail(error) {
    process.stderr.write(`${error.message || error}\n`);
    process.exit(1);
}

process.on('uncaughtException', fail);
process.on('unhandledRejection', fail);

(async () => {
    try {
        process.exit(await run());
    } catch (e) {
        fail(e);
    }
})();
