#!/usr/bin/env node

import main from '../src/index.js';

main(process.argv.slice(2))
    .then((exitCode) => {
        process.exitCode = exitCode;
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
