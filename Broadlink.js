const { BrainManager } = require("./BrainManager");

//"use strict";
const settings = require('./settings');
const neeoapi = require("neeo-sdk");
const readline = require('readline');
const ACcontrol = require('./ACController');
const CustomControl = require('./CustomController');
const fs = require('fs')
const { exec } = require("child_process");
var lineReader = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const driverTable = new Array();
var fileData;

function getConfig() {
  return new Promise(function (resolve, reject) {
    fs.readFile(__dirname+'/config.js', (err, data) => {
      if (err) {reject(null);}
      else { 
        if (data && (data != '')) {
          fileData = JSON.parse(data);  
          resolve(fileData);
        }
        else {
          reject (null);}
      }
    })
  })
}

function getMac(element)
{
  return element.split('--mac ')[1];
}



function extractDiscoveredCommands(message) {
  let commandsTable = new Array();
  if (message.search('# ')>0) {
    let intermTable = message.split('# ');
    for (i = 1; i < intermTable.length;i++) {
      commandsTable.push(intermTable[i].split('\n')[0]);
    };
  }
  return commandsTable;
}

function discoverBroadlinkCommands() {
  return new Promise(function (resolve, reject) {
    console.log('Starting Broadlink discovery');
    exec('python3 ' + settings.broadlinkpath + '/cli/broadlink_discovery' , function(error, stdout, stderr) {
      if (error) {reject('Error will using Broadlink Library :' + error)}
      else {
        console.log(stdout)
        resolve(stdout);
      }
    })
  })
}

function compareDiscoveryVsConfig(discoveredCommands) {// check for new broadlinks.
  return new Promise(function (resolve, reject) {
    let newBroadlink = new Array();
    getConfig().then((config) => {
      if (config) {
        discoveredCommands.forEach(command => {
           let found = false;
           config.broadlinks.forEach(element => {
               if (command == element.command) {
                 console.log('Broadlink ' + element.name + ' has been found.')
                 found = true}
          })
          if (!found) {newBroadlink.push(command)}
        })
      }
      else {newBroadlink = discoveredCommands}
      resolve(newBroadlink);
    })
  })
}
  

function compareConfigVsDiscovery(discoveredCommands) {// check if some broadlink are of line or IP adress has changed.
  return new Promise(function (resolve, reject) {
    let lostBroadlink = new Array();
    getConfig().then((config) => {
      if (config) {
          config.broadlinks.forEach(element => {
            let found = false;
            discoveredCommands.forEach(command => {
              if (getMac(element.command) == getMac(command)) {
                found = true;
                if (element.command != command) {
                  console.log('The broadlink ' + element.name + ' IP adress seems to have changed and has been updated');
                  element.command = command;
                }
              }
            });
            if (!found) {
              lostBroadlink.push(element);
            }
          });
          fs.writeFile(__dirname+'/config.js', JSON.stringify(config), err => {
            if (err) {
                console.log('Error writing file', err)
            } else {  
                console.log('Config updated')
            }
          }) 
      }
      resolve(lostBroadlink)
    })
  })
}

function addNewBroadlink(newBroadlink) {
  return new Promise(function (resolve, reject) {
    getConfig().then((config) => {
      if (config == null) {config = {broadlinks : []}; config.broadlinks = new Array()}
      if (newBroadlink.length>0){
        lineReader.question('How do you want to call the broadlink with mac address ' + getMac(newBroadlink[0]) + ' found? (no space, no special caracters):\n', function(answer) {
          config.broadlinks.push({'name':answer,'command':newBroadlink[0]})
          fs.writeFile(__dirname+'/config.js', JSON.stringify(config), err => {
            if (err) {
                console.log('Error writing file', err);
                reject(err);
            } else {  
                console.log(answer + ' added');
                newBroadlink.shift();
                resolve(addNewBroadlink(newBroadlink))
            }
          }) 
        }) 
      }
      else {resolve(null)}
    })
  })
}


function returnCommandFromConfig(name) {
  let returnedCommand = null;
  if (fileData) {
    fileData.broadlinks.forEach(element => {
      if (element.name == name) {returnedCommand = element.command}
    });
  }
  return returnedCommand;
}

function createDevices () {
   return new Promise(function (resolve, reject) {
    settings.drivers.forEach(deviceIndex => {
      console.log(deviceIndex.broadlink);
      if (deviceIndex.type == "AC") {
        let deviceCommand = returnCommandFromConfig(deviceIndex.broadlink);
        console.log(deviceCommand)
        if (deviceCommand) {
          const ACController = new ACcontrol(deviceIndex.name, settings.broadlinkpath + '/cli/' + returnCommandFromConfig(deviceIndex.broadlink));
          const theDevice = neeoapi.buildDevice("JAC - " + deviceIndex.name + " -Broadlink AC v3.0.5") // change "My first driver" to anything you like but keep the "" characters
              .setType("AVRECEIVER") // can be changed to "ACCESSOIRE" or "AVRECEIVER" or "DVB" or "DVD" or "GAMECONSOLE" or "LIGHT" or "MEDIAPLAYER" or "MUSICPLAYER" or "PROJECTOR" or "TV" or "VOD"
              .setManufacturer('Broadlink')
              .addButtonGroup('POWER')
              .addButtonGroup('Controlpad')
              .addButton({name: 'Fake Off', label: 'Fake Power Off'})
              .addSwitch(
                { name: 'Learn', label: 'Learn On/Off' },
                  { 
                    setter: ACController.switchLearnSet, getter: ACController.switchLearnGet 
                })
              .addTextLabel(
                { name: 'tempText', label: 'Temperature' }, ACController.getTempText)
              .addTextLabel(
                  { name: 'fanText', label: 'MIN<--------------AUTO-------------->MAX'}, ACController.getFanText)
              .addButtonHandler((name, deviceId) => ACController.onButtonPressed(name, deviceId))
              .registerSubscriptionFunction(ACController.registerStateUpdateCallback)
              .addSlider(
                { name: 'TempSlider', label: 'Temperature', range: [0,15], unit: 'C' },
                  {
                    setter: ACController.tempSlideSet, getter: ACController.tempSlideGet
                  })    
              .addSlider(
                { name: 'FanSlider', label: 'Fan', range: [0,6], unit: '' },
                  {
                    setter: ACController.fanSlideSet, getter: ACController.fanSlideGet
                  })   
              console.log("Device " + deviceIndex.name + " has been created.")
              driverTable.push(theDevice)
        }
      } 
      else if (deviceIndex.type == "Custom") {
        const CustoController = new CustomControl(deviceIndex.name, settings.broadlinkpath + '/cli/' + returnCommandFromConfig(deviceIndex.broadlink));
          const theDevice = neeoapi.buildDevice("JAC - " + deviceIndex.name + " -Broadlink AC v3.0.5") 
              .setType("AVRECEIVER") // can be changed to "ACCESSOIRE" or "AVRECEIVER" or "DVB" or "DVD" or "GAMECONSOLE" or "LIGHT" or "MEDIAPLAYER" or "MUSICPLAYER" or "PROJECTOR" or "TV" or "VOD"
              .setManufacturer('Broadlink')
              .addButtonGroup('POWER')
              .addButtonGroup('Controlpad')
              .addButtonGroup('Volume')
              .addButtonGroup('Numpad')
              .addButtonGroup('Color Buttons')
              .addButtonGroup('Menu and Back')
              .addButtonGroup('Channel Zapper')
              .addButtonGroup('Transport')
              .addButtonGroup('Transport Scan')
              .addButtonGroup('Transport Search')
              .addButtonGroup('Transport Skip')
              .addButtonGroup('Record')
              .addSwitch(
                { name: 'Learn', label: 'Learn On/Off' },
                  { 
                    setter: CustoController.switchLearnSet, getter: CustoController.switchLearnGet 
                })
              .addTextLabel(
                { name: 'StatusText', label: 'Status' }, CustoController.getStatusText)
              .registerSubscriptionFunction(CustoController.registerStateUpdateCallback)
              .addButtonHandler((name, deviceId) => CustoController.onButtonPressed(name, deviceId))
                
              
          console.log("Device " + deviceIndex.name + " has been created.")
          driverTable.push(theDevice)
          
      }
      
    })
    resolve(driverTable);
  })
}   


//MAIN
if (process.argv.slice(2)[0] == 'setup') {
  discoverBroadlinkCommands()
    .then((stdout) => {
          let discoveredCommands = extractDiscoveredCommands(stdout)
          compareConfigVsDiscovery(discoveredCommands)
          .then((lostBroadlink) => {
            lostBroadlink.forEach(element => {
              console.log('This broadlink seems offline: ' + element.name);
            })
          })  
          .then(() => {
            compareDiscoveryVsConfig(discoveredCommands)
            .then((newBroadlink) => {
              addNewBroadlink(newBroadlink)
              .then (()=> {
                  console.log('setup reached end.')
                })
            }) 
          })
          .catch (() => {console.log('Error during Broadlink detection, check your setup.')})
  })
} else {
  getConfig().then(()=> {
    createDevices().then(() => {
    var brainMgr = new BrainManager(__dirname +'/brainConfig.js', driverTable, 'JAC Broadlink');
    brainMgr.launchNeeo();
    })
  })
}

 
