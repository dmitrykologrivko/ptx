#!/usr/bin/env node

import main from '../src/index.js';

main(['config', '--init'])
    .catch((error) => {
        process.stderr.write(`ptx: could not create config: ${error.message}\n`);
    });
