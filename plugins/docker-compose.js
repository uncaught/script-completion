/**
 * This plugin adds some basic completion for docker-compose.
 * 
 * Their own completion script (https://github.com/docker/compose/blob/1.29.2/contrib/completion/bash/docker-compose) does not
 * seem to complete services that are not started, yet. It relies on `docker-compose ps --services` to retrieve them, which only
 * reports running or stopped services.
 */

const { resolve } = require('path');
const { debug } = require('../logger.js');
const fs = require('fs').promises;

/**
 * @typedef {{services?: true, single?: true}} CompletionServices
 * @typedef {Array<string|string[]|CompletionServices>} CompletionArgs
 */

/**
 * @type Record<string, {options?: CompletionArgs, arguments?: CompletionArgs}>
 */
const commands = {
    build: {},
    config: {},
    create: {},
    down: {
        options: [
            '--rmi',
            ['-v', '--volumes'],
            '--remove-orphans',
            ['-t', '--timeout'],
        ],
    },
    events: {},
    exec: {
        options: [
            ['-d', '--detach'],
            '--privileged',
            ['-u', '--user'],
            '-T',
            ['-e', '--env'],
            ['-w', '--workdir'],
        ],
        arguments: [{ services: true, single: true }],
    },
    help: {},
    images: {},
    kill: {},
    logs: {
        options: [['-f', '--follow'], ['-t', '--timestamps'], '--tail', '--no-color'],
        arguments: [{ services: true }],
    },
    pause: {},
    port: {},
    ps: {
        options: [
            ['-a', '--all'],
            '--services',
            '--filter',
            ['-q', '--quiet'],
        ],
        arguments: [{ services: true }],
    },
    pull: {
        options: [
            '--ignore-pull-failures',
            '--no-parallel',
            ['-q', '--quiet'],
            '--include-deps',
        ],
        arguments: [{ services: true }],
    },
    push: { options: ['--ignore-push-failures'] },
    restart: {
        options: [['-t', '--timeout']],
        arguments: [{ services: true }],
    },
    rm: {
        options: [['-f', '--force'], ['-s', '--stop'], '-v', ['-a', '--all']],
        arguments: [{ services: true }],
    },
    run: {
        options: [
            ['-d', '--detach'],
            '--name',
            '--entrypoint',
            '-e',
            ['-l', '--label'],
            ['-u', '--user'],
            '--no-deps',
            '--rm',
            ['-p', '--publish'],
            '--service-ports',
            '--use-aliases',
            ['-v', '--volume'],
            '-T',
            ['-w', '--workdir'],
        ],
        arguments: [{ services: true, single: true }],
    },
    scale: {},
    start: { arguments: [{ services: true }] },
    stop: {
        options: [['-t', '--timeout']],
        arguments: [{ services: true }],
    },
    top: {},
    unpause: { arguments: [{ services: true }] },
    up: {
        options: [['-d', '--detach'], ['-t', '--timeout'], '--no-deps', '--remove-orphans'],
        arguments: [{ services: true }],
    },
    version: {},
};

const optionCompletion = {
    '--entrypoint': [],
    '-e': [],
    '-l': [],
    '--filter': [],
    '--label': [],
    '--name': [],
    '--rmi': ['all', 'local'],
    '-t': ['0', '10', '20', '30'],
    '--timeout': ['0', '10', '20', '30'],
    '-u': [],
    '--user': [],
    '-w': [],
    '--workdir': [],
};

/**
 * Retrieves the service names from a docker-compose.yml.
 * 
 * This parses the yaml line by line without any library to avoid dependencies.
 * 
 * @param {string} configDir 
 * @param {string} file 
 * @returns {string[]}
 */
async function getServices(configDir, file) {
    if (!file) {
        return [];
    }
    const ignoreYamlLine = /(^\s*#|^\s*$)/;
    const isServicesLine = /^services:/;
    const isService = /^(\s+)(\w+):/;
    const composeFile = resolve(configDir, file);
    const content = await fs.readFile(composeFile);
    const lines = content.toString().split('\n');
    let inServices = false;
    let servicesIndentation = 0;
    const services = [];
    lines.forEach((line, i) => {
        if (ignoreYamlLine.test(line)) {
            return;
        }
        if (isServicesLine.test(line)) {
            inServices = true;
        }
        if (inServices) {
            const matches = line.match(isService);
            if (matches) {
                const curIndentation = matches[1].length;
                const curName = matches[2];
                if (servicesIndentation) {
                    if (servicesIndentation === curIndentation) {
                        services.push(curName);
                    } else if (curIndentation < servicesIndentation) {
                        inServices = false;
                    }
                } else {
                    servicesIndentation = curIndentation;
                    services.push(curName);
                }
            }
        }
    });
    return services;
}

/**
 * @param {string[]} resolvedArgs
 * @param {string} current
 * @param {{file: string}} pluginOptions
 * @param {{configDir: string}} scOptions
 * @returns {string[]}
 */
async function complete(resolvedArgs, current, { file }, { configDir }) {
    await debug('docker-compose-plugin', resolvedArgs, current, { file }, { configDir });
    if (resolvedArgs.length === 0) {
        return Object.keys(commands);
    }
    const cmd = resolvedArgs[0];

    const lastArg = resolvedArgs[resolvedArgs.length - 1];
    if (optionCompletion[lastArg]) {
        return optionCompletion[lastArg];
    }

    const resolvedSet = new Set([...resolvedArgs.slice(1)]);
    const { options = [], arguments = [] } = commands[cmd] || {};
    const suggestions = (current[0] === '-' || !arguments.length) ? options : arguments;

    const result = [];
    for (const suggestion of suggestions) {
        if (typeof suggestion === 'string' && !resolvedSet.has(suggestion)) {
            result.push(suggestion);
        } else if (Array.isArray(suggestion) && !suggestion.some((sug) => resolvedSet.has(sug))) {
            result.push(...suggestion);
        } else if (suggestion.services) {
            const services = await getServices(configDir, file);
            const remaining = services.filter((service) => !resolvedSet.has(service));
            if (remaining.length && (!suggestion.single || services.length === remaining.length)) {
                result.push(...remaining);
            }
        }
    }
    return result;
};

module.exports = complete;