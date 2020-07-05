# BroadlinkNeeo
Custom driver for Broadlink and Neeo remote (and one Air Con specialized driver)

https://www.youtube.com/watch?v=lTAFxFwSmB4

This driver allows you to totally take control of your Broadlink devices using your Neeo remote.
If you don't have a broadlink IR blaster device and a Neeo remote you will not be interrested.


## Features:
- Broadlink autodetection and setup (tested on RM3 Mini all firmwares, should work on any Broadlink as using the excellent library: https://github.com/mjg59/python-broadlink, maximum kudos to the creators !!)
- Learn capability directly from Neeo Remote: use your legacy remote to teach the broadlink and never use it again.
- various button group supported: numpad, color buttons, volume, channel zapper, record, transport, etc...
- dedicated Air Con control driver with enriched interface (as in the youtube video).

## How it works:
This driver is a normal Neeo driver so you should have installed the Neeo SDK first.
Then you would need to install this excellent driver for Broadlink: Then you would need to install this excellent driver for Broadlink: https://github.com/mjg59/python-broadlink.
This BroadlinkNeeo driver consist of 4 files:
- Broadlink.js #the main file.
- ACController.js #Dedicated controller for air conditionned.
- CustomController.js #Dedicated controller for pretty much anything you want.
- Setting.js #this file is the one you should edit in order to configure your own setup.
In this file you manipulate 2 entities: 
- the first one is broadlink: you have one entry by physical broadlink you have.
- the second one is drivers: you have as many drivers as you want as the same broadlink can be used to control a TV, a switch, Air Con, Fan, anything with IR blaster. It is advised to have one driver by actual device you want to control.

## Setup: 
first step is to install this project : https://github.com/mjg59/python-broadlink.
All the broadlink communcation is done through this genius project. The driver won't work if you don't have installed it.
After the setup, the one think you need to get right is to write the path to the python-broadlink driver you just installed. 
You need to go to the settings.js file and look for a line like that:
"broadlinkpath": "~/Neeo/Python/python-broadlink-master".
If you are not sure of the path, just go to the python-broadlink-master folder you have created when installing the driver and type: pwd. It should display the correct path.
Be mindfull that the path should end by 'python-broadlink-master' (no '/' at the end.

To launch the driver, you just need to run the command:
==> node Broadlink.js
1. First your driver will detect your broadlinks. You will be asked to give them a name. Please take note of these names and keep them for later. Choose simple one word names, it is case sensitive and avoid special caracter. For example: Living, Bedroom... If you don't knw the mac address of your broadlink and then don't know which one is detected, just unplug all broadlink but one. Then repeat for other devices you have.
A config.js file will be created with the list of your broadlinks, their IP address and mac address. If a broadlink has its IP address changed, the driver will detect it and automatically correct it in the config file. Don't change this file if you don't know what you are doing (well in fact, just don't change this file, if not sure, delete it and a new one will be created).
2. Now you can edit the setting.js with other values. You need to decide how many drivers you want to create (in the drivers section.
        {"name":"LivingAC", "type":"AC", "broadlink":"Living"},
        {"name":"LivingTV", "type":"Custom", "broadlink":"Living"},
        {"name":"BedroomAC", "type":"AC", "broadlink":"Bedroom"},
        The name part: is the name your driver will have. 
        The type can be AC (air con) or Custom (any type). 
        The broadlink has to be the name of one of your broadlink you have setup earlier (case sensitive).
3. Now you can launch again the driver, he will setup the Neeo Brain IP and port, if you have many, you can go to the config.js file to manually put the one you want.
4. Finally you are good to go to your Neeo Mobile app in order to find the drivers (search at 'JAC' or the name of the driver you choose in the settings file). The drivers are configured as AVReceiver by default as it allows reacher feature, too make them appears on the screen, you need to create a recipe calling them with 'show control'. You can then choose the proper name and icon for your device.
At first, in order to teach the IR codes to your device, you need to use both the switch : Learn On/Off and the label: status (custom driver) or tempText (AC driver).
5. Switch on using the Learning mode by using the Learn switch. Then press the button you want to learn and then press your legacy remote equivalent button in direction of the broadlink used by this driver. When ready to learn or when the button has been learned, the remote well tell you by using the label (status or tempText).
If you want to test your button, don't forget to put Learn mode off as the driver will not send any command while in learn mode on. If your command is not know by the driver, a new command will be added, if you learn on an existing button, the button will be overwritten with the new IR value.
6. When wverythin is learned, you can switch off the switch and suppress it from the shortcut, you will not need it anymore.

## Note:

- NOTE 1: You may have noticed there is a 'fake power off' button. This is because if you press 'power off' directly, you won't be able to attach an IR command to it as it will... power off. The trick is thus to teach the fake power off button. It will automatically also assign the value to the real power off. So after you taught the fake power off, you can suppress the shortcut and just use the proper power off to power off your IR device.
- NOTE 2: You will see that a file will be created with the name of your driver, it contains all the IR commands. If you have many similar devices to command (for example, very useful for Air con, I have 7 myself), you just need to teach one device and copy the file and replace the name of the file by the other drivers name (for example ACLiving1,js, ACLiving2.js, Bedroom1.js, ...).
- NOTE 3 (SPECIAL NOTE FOR THE AC DRIVER): The setup of AC is a bit more complexe as the interface is richer and using the sliders for more convenience. You need to teach the remote a lot of values. You need to teach your remote temperatures 16 to 31 with Min Fan. Then you need to teach your remote the temperatures 16 to 31 with normal/auto fan, then you need to teach your remote the temperatures 16 to 31 with max fan.
That's 48 values you will have to configure!
In order to do it, I strongly advise you to use the direction pad of the remote, more accurate than the screen (left/right pad control the temperature, up/down pad control the fan speed).
It is a boring work but in fact done in a couple of minutes, the most practical way to do it is:
1. Set the fan speed to min, then temperature to 17.
2. Do the same with your legacy remote, set it to 17, minimum fan speed (or the one you like to be at minimum, (quiet, one bar, 2 bars, whatever you like).
3. activate learning mode
4. press pad left to activate learn for Min 16 (fan min, temperature 16).
5. press down button to legacy aircon remote to activate 16 fan min.
6. the Neeo remote should tell you it has learned the value.
7. press right on the neeo pad and then up on the legacy aircon remote. you should this way learn 17, min fan.
8. continue up to 31 doing the same.
9. then do the same for middle fan and max fan and then you are all set.

