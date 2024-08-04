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
const roborockApi = await python('roborock.cli');
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
const roborockSession = await roborockApi.RoborockApiClient(roborockCredentials.username);
let userData = await pyasyncio.run(await roborockSession.pass_login(roborockCredentials.password));

console.log('User Data (password):');
console.log(userData);

// Demonstrate logging in with an emailed one-time code.
await pyasyncio.run(await roborockSession.request_code());

// Prompt the user to enter the 2FA code.
const sms2fa = await prompt({
  type: 'input',
  name: 'code',
  message: '2FA required. Check your email for a code and enter it:',
});

// Try to log in using the supplied code.
userData = await pyasyncio.run(await roborockSession.code_login(sms2fa.code));

console.log('User Data (2fa):');
console.log(userData);

const homeData = await pyasyncio.run(await roborockSession.get_home_data(userData));
const deviceList = await homeData.get_all_devices();

console.log('Home Data:');
console.log(homeData);

for await (const device of deviceList) {
  for await (const product of await homeData.products) {
    if(await device.product_id === await product.id) {
      const deviceInfo = await roborockApi.DeviceData(device, await product.model);
      const mqttClient = await roborockApi.RoborockMqttClientV1(userData, deviceInfo);
      const deviceStatus = await pyasyncio.run(await mqttClient.send_command('get_status'));
      console.log(deviceStatus);
    }
  }
}

// Exit python to allow node to exit.
python.exit();