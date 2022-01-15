#!/usr/bin/node
const args = process.argv.slice(2);
process.stdout.write(`bar is at your service!\n`);
process.stdout.write(`bar was called with '${JSON.stringify(args)}'\n`);
