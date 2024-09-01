
# Homebridge Roborock Control Plugin

This plugin exposes [Roborock](https://us.roborock.com/) robot vacuums in Homekit. A Roborock account is required, and the vacuum must be registered via the Roborock app prior to using this plugin.

## Installation

Install the plugin via the Homebridge UI. Before it can be used, the plugin configuration must be populated with your Roborock login credentials. The `Auth Mode` dropdown box allows you to select either `Password` or `One-Time Code` logins. To obtain the `One-Time Code Login` details, do the following:

- From a terminal on your Homebridge machine, run `npx homebridge-roborock-control`
- Follow the on-screen instructions. Enter your Roborock `username`, then enter the 2FA code you receive via email.
- Copy and paste the script's output into the `One-Time Code Login` field on the plugin's configuration screen.

## Instructions

The plugin will expose a Fan accessory for each Roborock vacuum in your home, since Homekit does not natively support vacuum devices. Turning the "fan" on will start the vacuum cleaning, while turning it off will send the vacuum back to its dock. The plugin will also show the vacuum's charging state and battery level.

## Requirements

The plugin requires `python3` and `pip3` to be installed on the system that Homebridge is running on. It will not attempt to install these packages itself.