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
export const pyasyncio = await python('asyncio');
export const pyroborock =
    await python(join(__dirname, '..', 'dist', 'python', 'pyimport.py'));

const {prompt} = enquirer_default;

// Ask the user for their Roborock email and password.
const rrCredentials = await prompt([
  {
    type: 'input',
    name: 'username',
    message: 'Enter Roborock username (email):',
  },
]);

// Log in with an emailed one-time code.
const rrClient = await pyroborock.RoborockApiClient(rrCredentials.username);
await pyasyncio.run(await rrClient.request_code());

// Prompt the user to enter the 2FA code.
const emailOtp = await prompt({
  type: 'input',
  name: 'code',
  message: 'Check your email for a one-time code and enter it:',
});

// Try to log in using the supplied code.
const userData = await pyasyncio.run(await rrClient.code_login(emailOtp.code));
const userJson = await pyroborock.json.dumps(await userData.as_dict());

console.log('\nPaste the following into the plugin\'s config:\n');
console.log(userJson);

// Exit python to allow node to exit.
python.exit();