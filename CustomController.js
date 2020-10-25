//'use strict';
const { exec } = require("child_process");
const fs = require('fs')


module.exports = function controller(name, command) {
    this.sendComponentUpdate;
    this.command = command;
    this.learnFlag = false;
    this.IRFile;
    this.IRFileName = './' + name + '.js';
    var self = this;
    
  
   this.registerStateUpdateCallback = function(updateFunction) {
    console.log('[CONTROLLER] register update state for AC');
    self.sendComponentUpdate = updateFunction;
  };

  this.getIR = function() {
    return new Promise(function (resolve, reject) {
      self.IRFile = {IR : []};
      console.log('log')
      fs.readFile(self.IRFileName, (err, data) => {
        if (err) {resolve(self.IRFile);}
        else { 
          if (data && (data != '')) {
            self.IRFile = JSON.parse(data);  resolve(self.IRFile);
          }
          else {resolve (self.IRFile);}
        }
      })
    })
  }

  
  this.getStatusText = function (){
    return '';
  }
 
  this.switchLearnGet = function () {
    return self.learnFlag
  }
  this.switchLearnSet = function (deviceId, learnFlag) {
    self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'Learn',value: learnFlag})
    .catch( (err) => {console.log(err)}) 
    self.learnFlag = learnFlag;
  }

  this.findIRCommand = function (IRFile, IRCommand) {
    let returnCommand = null;
    IRFile.IR.forEach(element => {
       if (element.Name == IRCommand) {
        returnCommand = element.Code;
      }
    });
    return returnCommand;
  }

  this.findIRCommandIndex = function (IRFile, IRCommand) {
    let i;
    for (i=0; i<IRFile.IR.length; i++) {
       if (IRFile.IR[i].Name == IRCommand) {
        return i;
      }
    };
    return null;
  }


  this.executeCommand = function (deviceId, command) {
    return new Promise(function (resolve, reject) {
      if (self.switchLearnGet()) {
      self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'StatusText',value: "Trying to learn command:" + command})
          .catch( (err) => {console.log(err)}) 
          exec('python ' + self.command+ ' --learn', (stdout, stderr) => {
            if (!stderr.includes('No data received...')) {
              self.getIR().then((IRFile)=>{
                if (IRFile.IR) {
                  let index = self.findIRCommandIndex(IRFile, command);
                  if (index != null) {
                    IRFile.IR[index].Code = stderr.split('\n')[1];
                  }
                  else {
                    IRFile.IR.push({Name:command, Code:stderr.split('\n')[1]});
                  }
                  fs.writeFile(self.IRFileName, JSON.stringify(IRFile)+'\n', err => {
                    if (err) {
                        console.log('Error writing file', err);
                        reject(err);
                    } else {  
                        console.log('New command learned.');
                        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'StatusText',value: "New command learned: " + command})
                    }
                  })
                   
                }
              })
            }
          })
    }
    else {
      self.getIR().then((IRFile)=>{
        if (IRFile.IR) {
          let IRCommand = self.findIRCommand(IRFile, command);
           if (IRCommand == null) {
            self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'StatusText',value: "Command doesn't exist, activate learn feature :" + fanTableDevice[self.currentFan] + self.currentTemp})
           }
           else{
             exec('python ' + self.command+ ' --send ' + IRCommand);
          }
        }
      })
    }
    resolve();
  })
}
  this.onButtonPressed = function(name, deviceId) {
    console.log(`[CONTROLLER] ${name} button pressed for device ${deviceId} with ${self.command}`);
    if (name == "POWER OFF" || name == "Fake Off") {
      self.executeCommand(deviceId, name).then(()=>{
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'StatusText',value: 'Air Con is switched off'})
        .catch( (err) => {console.log(err)}) 
      })
    }
    else {
      self.executeCommand(deviceId, name).then(()=>{
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'StatusText',value: 'Command Actuvated for ' + name})
        .catch( (err) => {console.log(err)}) 
      })
    }

  }
}

