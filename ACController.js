//'use strict';
const { exec } = require("child_process");
const fs = require('fs')


const tempTable = {
  16:   '<=-16------------------------------------------------------------=>',
  17:   '<=-----17--------------------------------------------------------=>',
  18:   '<=---------18----------------------------------------------------=>',
  19:   '<=-------------19------------------------------------------------=>',
  20:   '<=-----------------20--------------------------------------------=>',
  21:   '<=---------------------21----------------------------------------=>',
  22:   '<=-------------------------22------------------------------------=>',
  23:   '<=-----------------------------23--------------------------------=>',
  24:   '<=---------------------------------24----------------------------=>',
  25:   '<=-------------------------------------25------------------------=>',
  26:   '<=-----------------------------------------26--------------------=>',
  27:   '<=---------------------------------------------27----------------=>',
  28:   '<=-------------------------------------------------28------------=>',
  29:   '<=-----------------------------------------------------29--------=>',
  30:   '<=---------------------------------------------------------30----=>',
  31:   '<=-------------------------------------------------------------31=>',
}
const fanTable = {
  1:    '-----------####--------------------------------------------------------',
  3:    '--------------------------------#####----------------------------------',
  5:    '------------------------------------------------------####-------------',
}
const fanTableDevice = {
  1:    'ACFANMIN',
  3:    'AC',
  5:    'ACFANMAX',
}
module.exports = function controller(name, command) {
    this.sendComponentUpdate;
    this.currentTemp = 24;
    this.currentFan = 3;
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
 
  
  this.getTempText = function (){
    return (tempTable[0]);
  }

  this.getFanText = function (){
    return fanTable[self.currentFan];
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
      self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: "Trying to learn command:" + command})
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
                        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: "New command learned: " + command})
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
            self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: "Command doesn't exist, activate learn feature :" + fanTableDevice[self.currentFan] + self.currentTemp})
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

/*  
  this.executeCommand = function (deviceId) {
    self.getIR().then((IRFile)=>{
      if (IRFile.IR) {
        let IRCommand = self.findIRCommand(IRFile, fanTableDevice[self.currentFan] + self.currentTemp);
         if (IRCommand == null) {
          self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: "Trying to learn command:" + fanTableDevice[self.currentFan] + self.currentTemp})
          .catch( (err) => {console.log(err)}) 
          exec('python ' + self.command+ ' --learn', (stdout, stderr) => {
            if (!stderr.includes('No data received...')) {
              IRFile.IR.push({Name:fanTableDevice[self.currentFan] + self.currentTemp, Code:stderr.split('\n')[1]});
              fs.writeFile(self.IRFileName, JSON.stringify(IRFile)+'\n', err => {
                if (err) {
                    console.log('Error writing file', err);
                    reject(err);
                } else {  
                    console.log('New command learned.');
                    self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: "New command learned: " + fanTableDevice[self.currentFan] + self.currentTemp})
                }
              }) 
            }
          });
         }
         else {
          console.log(self.switchLearnGet())
          if (self.switchLearnGet()) {
          }
          else {
            exec('python ' + self.command+ ' --send ' + IRCommand);
          }
        }
       }
    })
  }
*/

  this.tempSlideSet = function(deviceId, value){
    self.currentTemp = Math.round(value) + 16;
    self.executeCommand(deviceId, fanTableDevice[self.currentFan] + self.currentTemp).then(()=>{
      self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: tempTable[self.currentTemp]})
      .catch( (err) => {console.log(err)}) 
       self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'TempSlider',value: (self.currentTemp-16)})
      .catch( (err) => {console.log(err)})   
    })
  }

  this.tempSlideGet  = function(){
    return (self.currentTemp-16);
  }

  this.fanSlideSet = function(deviceId, value) {
    if (value <2) { self.currentFan = 1}
    else if (value > 4) { self.currentFan = 5}
    else {self.currentFan = 3}
    self.executeCommand(deviceId, fanTableDevice[self.currentFan] + self.currentTemp).then(()=>{
      self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'fanText',value: fanTable[self.currentFan]})
    .catch( (err) => {console.log(err)}) 
    self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'FanSlider',value: self.currentFan})
    .catch( (err) => {console.log(err)})  
    })
    
  }
 
  this.fanSlideGet = function (){
      return (self.currentFan);
  }

  this.onButtonPressed = function(name, deviceId) {
    console.log(`[CONTROLLER] ${name} button pressed for device ${deviceId} with ${self.command}`);
    if (name == "POWER ON") {
      self.executeCommand(deviceId, fanTableDevice[self.currentFan] + self.currentTemp).then(()=>{
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: tempTable[self.currentTemp]})
        .catch( (err) => {console.log(err)}) 
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'TempSlider',value: (self.currentTemp-16)})
        .catch( (err) => {console.log(err)}) 
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'fanText',value: fanTable[self.currentFan]})
        .catch( (err) => {console.log(err)}) 
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'FanSlider',value: self.currentFan})
        .catch( (err) => {console.log(err)})  
      })
    }
    else if (name == "POWER OFF" || name == "Fake Off") {
      self.executeCommand(deviceId, 'ACOff').then(()=>{
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: 'Air Con is switched off'})
        .catch( (err) => {console.log(err)}) 
         self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'TempSlider',value: (self.currentTemp-16)})
        .catch( (err) => {console.log(err)})   
      })
    }
    else if (name == "CURSOR LEFT" || name == "CURSOR RIGHT") {
      if (name == "CURSOR RIGHT")
      {
        if (self.currentTemp < 31) {self.currentTemp++;}
      } else {
        if (self.currentTemp > 16) {self.currentTemp--;}
      }
      self.executeCommand(deviceId, fanTableDevice[self.currentFan] + self.currentTemp).then(()=>{
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'tempText',value: tempTable[self.currentTemp]})
        .catch( (err) => {console.log(err)}) 
         self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'TempSlider',value: (self.currentTemp-16)})
        .catch( (err) => {console.log(err)})   
      })
    }
    else if (name == "CURSOR UP" || name == "CURSOR DOWN") {
      if (name == "CURSOR UP")
      {
        if (self.currentFan < 5) {self.currentFan = self.currentFan +2;}
      } else {
        if (self.currentFan > 2) {self.currentFan = self.currentFan -2;}
      }
      self.executeCommand(deviceId, fanTableDevice[self.currentFan] + self.currentTemp).then(()=>{
        self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'fanText',value: fanTable[self.currentFan]})
      .catch( (err) => {console.log(err)}) 
      self.sendComponentUpdate({uniqueDeviceId: deviceId,component: 'FanSlider',value: self.currentFan})
      .catch( (err) => {console.log(err)})  
      })
    }
  }
}

