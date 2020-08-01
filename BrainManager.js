const neeoapi = require("neeo-sdk");
const fs = require('fs');
//DISCOVERING BRAIN
function BrainManager(neeoConfigFile, deviceTable, driverName) {
  this.neeConfigFile = neeoConfigFile;
  this.deviceTable = deviceTable;
  this.driverName = driverName;
  this.fileDriverConfig;
  this.driverConfig = { brainip: '', brainport: '' };
  this.attempt = 40;
  var self = this;
  this.getNeeoConfig = function () {
    return new Promise(function (resolve, reject) {
      try {
        fs.readFile(neeoConfigFile, (err, data) => {
          if (err) {
            resolve(null);
          }
          else {
            if (data && (data != '')) {
              self.fileDriverConfig = JSON.parse(data);
              if (self.fileDriverConfig.brainip && (self.fileDriverConfig.brainip != '')
                && self.fileDriverConfig.brainport && (self.fileDriverConfig.brainport != '')) { //test if file is good
                resolve(self.fileDriverConfig);
              }
              else {
                resolve(null);
              }
            }
            else {
              resolve(null);
            }
          }
        });
      }
      catch (error) {
        resolve(null);
      }
    });
  };
  this.setupNeeo = function () {
    return new Promise(function (resolve, reject) {
      console.log('Trying to discover a NEEO Brain...');
      neeoapi.discoverOneBrain()
        .then((brain) => {
          console.log('- Brain discovered:', brain.name);
          console.log('at IP: ' + brain.iparray);
          self.driverConfig = { brainip: brain.iparray, brainport: '5500' };
          resolve(self.driverConfig);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
  this.launchNeeo = function () {
    self.getNeeoConfig()
      .then((config) => {
        if (config) {
          self.runNeeo();
        }
        else {
          self.setupNeeo()
            .then((config) => {
              self.runNeeo();
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };
  this.runNeeo = function () {
    return new Promise(function (resolve, reject) {
      try {
        const neeoSettings = {
          brain: self.driverConfig.brainip.toString(),
          port: self.driverConfig.brainport.toString(),
          name: self.driverName,
          devices: self.deviceTable
        };
        console.log(neeoSettings);
        console.log('Trying to start the Driver');
        neeoapi.startServer(neeoSettings)
          .then(() => {
            if (self.fileDriverConfig != self.driverConfig)
              fs.writeFile(self.neeConfigFile, JSON.stringify(self.driverConfig), err => {
                if (err) {
                  console.log('Error writing file, discovery will happen again next time', err);
                }
                else {
                  console.log('Driver running, you can search it on the remote control.');
                }
                resolve();
              });
          })
          .catch(err => {
            console.log('Failed running Neeo with error: ' + err);
            self.driverConfig.brainport = Number(self.driverConfig.brainport) + 1;
            console.log('trying to increment port:', self.driverConfig.brainport);
            self.runNeeo();
          });
      }
      catch (error) {
        console.log('Brain couldnt start normally.' + error);
        if (self.attempt > 0) {
          self.setupNeeo()
            .then((config) => {
              self.runNeeo();
            });
          self.attempt--;
        }
      }
    });
  };
}
exports.BrainManager = BrainManager;
