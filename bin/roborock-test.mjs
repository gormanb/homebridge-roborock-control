#!/usr/bin/env node

/* eslint-disable no-undef */
/* eslint-disable no-console */

import enquirer_default from 'enquirer';
import {python} from 'pythonia';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';

// Get the path of the directory where this file is located.
const __dirname = dirname(fileURLToPath(import.meta.url));

// Gracefully shut down python before exiting.
process.on('exit', () => {
  try {
    python.exit();
  } catch (ex) {
    // Ignore exception if already exited.
  }
});

// Obtain references to the libraries we need.
await (await python('sys')).path.append(join(__dirname, '..', 'pylib'));
const roborockCli = await python('roborock.cli');
const pyasyncio = await python('asyncio');
const {prompt} = enquirer_default;

// Ask the user for their Roborock email and password.
const roborockCredentials = await prompt([
  {
    type: 'input',
    name: 'username',
    message: 'Enter Roborock username (email):',
  },
  {
    type: 'password',
    name: 'password',
    message: 'Enter Roborock password:',
  },
]);

// Use these credentials to create a Roborock login.
const roborockSession = await roborockCli.RoborockApiClient(roborockCredentials.username);
const userData = await pyasyncio.run(await roborockSession.pass_login(roborockCredentials.password));
const homeData = await pyasyncio.run(await roborockSession.get_home_data(userData));
const deviceList = await homeData.get_all_devices();

for await (const device of deviceList) {
  console.log(device);
}

// Exit python to allow node to exit.
python.exit();