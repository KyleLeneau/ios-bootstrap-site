var wrench = require('wrench'),
    util = require('util'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    async = require('async'),
    zip = require("node-native-zip");

/*
 * Project generator route. 
 * This entire route is super brute force and rather naive. However, it works and is easy to follow. 
 * TODO: Possible improvements include doing more async calls with the fs module since this uses the async.js
 * lib it shouldn't be too bad to impelement. 
*/
exports.index = function(req, res) {

    // 1. Create a temporary file(s) location. 
    // 2. Rename the directories accordingly. 
    // 3. Loop over all the files and perform replacements. 
    // 4. Zip up the content & Send to the output stream
    // 5. Delete the temporary file(s). 
    // 6. All Done - Do some 12 ounce curls. 

    console.log(process.env.PWD);

    // Improvements:
    //   get the latest source from github automatically
    //   

    var app = {
      name: req.query.appName,
      org: req.query.orgName,
      bundleId: req.query.bundleId,
      prefix: req.query.classPrefix
    };

    console.log("App Inputs: ");
    console.log(app);

    // iOS Bootstrap source directory
    var sourceDir = process.env.PWD + '/ios-bootstrap';

    // Temporary locationwhere the users project will be generated.
    var destDir = process.env.PWD + '/tmp/' + app.name; 

    console.log("sourceDir: " + sourceDir);
    console.log("destDir: " + destDir); 

    // Copy the files to temp directory. 
    wrench.copyDirSyncRecursive(sourceDir, destDir);

    // Read the files into an array
    var theFiles = wrench.readdirSyncRecursive(destDir);
    console.log(theFiles);

    // Generate an array of functions to call in parallel later
    var callItems = [];
    theFiles.forEach(function(currentFile) {
      var genFileFunc = generateFileFunc(destDir + "/" + currentFile, app);
      callItems.push(genFileFunc);
    });

    async.parallel(callItems, function(err, results) {
      
      if(err) {
        console.error("**** ERROR ****");
        console.error(err);
      } else {
        
        // Now, all items have been executed, perform the copying/etc.
        renameSourceDirectories(destDir, app.name);
        removeGitModuleFiles(destDir);

        sendContentAsZip(app, destDir, res);
      }
    });
}

function generateFileFunc(file, app) {
  return function(callback) {
    generateFile(file, app, callback);
  }
}

function generateFile(file, app, callback) {

  // Check for a class prefixed file name to replace it
  if (file.fileNameStartsWith('IOB')) {
    file = renamePrefixFile(file, app.prefix);
  }

  var stats = fs.lstatSync(file);
  if(!stats.isDirectory() && !file.endsWith(".png")) { 
    // Only work with text files, no directories or png files.  
    // Above == terrible code, but for android-bootstrap, it works. Pragmatic & KISS. FTW.
    
    // Must include the encoding otherwise the raw buffer will
    // be returned as the data.
    var data = fs.readFileSync(file, 'utf-8');
    console.log("Current File: " + file);

    // Sure, we could chain these, but this is easier to read.
    data = replaceAppName(data, app.name);
    data = replaceBundleId(data, app.bundleId);
    data = replaceClassPrefix(data, app.prefix);    

    // Replace file header comment block
    if (file.endsWith('.h') || file.endsWith('.m')) {
      // data = replaceFileHeaderComments(data, app.comments)
    }

    // Finally all done doing replacing, save this bad mother.
    fs.writeFileSync(file, data); 
  }

  // Call back to async lib. 
  callback(null, file);
}

function replaceAppName(fileContents, newAppName) {
  var APP_NAME = "iOS Bootstrap";
  var nameRegExp = new RegExp(APP_NAME, 'g'); // global search

  return fileContents.replace(nameRegExp, newAppName);
}

function replaceBundleId(fileContents, newBundleId) {
  var BOOTSTRAP_TOKEN = "com.iosbootstrap";
  var tokenRegExp = new RegExp(BOOTSTRAP_TOKEN, 'g'); // global search

  return fileContents.replace( tokenRegExp, newBundleId );
}

function replaceClassPrefix(fileContents, newClassPrefix) {
  var PREFIX = "IOB";
  var tokenRegExp = new RegExp(PREFIX, 'g'); // global search

  return fileContents.replace( tokenRegExp, newClassPrefix );
}

function renamePrefixFile(file, classPrefix) {
  var oldFile = file;
  file = file.replace('IOB', classPrefix);
  console.log('Renaming file: ' + oldFile + ' To new file: ' + file);
  fs.renameSync(oldFile, file);
  return file;
}

function sendContentAsZip(app, destDir, res) {
  
  var fileObjects = getFileObjectsFrom(destDir, wrench.readdirSyncRecursive(destDir));
  
  var archive = new zip();
  archive.addFiles(fileObjects, function(err) {
    if(err) {
      console.log(err);
      res.statusCode = 500;
      res.end(); 
    } else {
      
      archive.toBuffer(function(buff) {
        
        res.contentType('zip');
        res.setHeader('Content-disposition', 'attachment; filename=' + app.name + '.zip');
        res.send(buff);
        res.end();        

        wrench.rmdirSyncRecursive(destDir, false);
      });
    }
  });
}

function getFileObjectsFrom(destDir, files) {
  var fileObjs = []
  for(var i=0; i<files.length;i++) {
    var filePath = destDir + "/" + files[i];
    var stats = fs.lstatSync(filePath);
    if(!stats.isDirectory())
      fileObjs.push({ name: files[i], path: filePath });
  }
  return fileObjs;
}

function renameSourceDirectories(destDir, appName) {

  console.log(destDir);
  console.log(appName);

  var oldSourceDir = destDir + "/iOS Bootstrap";  
  var newSourceDir = destDir + "/" + appName;
  console.log("Copying source from" + oldSourceDir + " to directory " + newSourceDir);
  fs.renameSync(oldSourceDir, newSourceDir);

  var oldTestDir = destDir + "/iOS Bootstrap Tests";
  var newTestDir = destDir + "/" + appName + " Tests"; 
  console.log("Copying source from" + oldTestDir + " to directory " + newTestDir);
  fs.renameSync(oldTestDir, newTestDir);

  var oldProjDir = destDir + "/iOS Bootstrap.xcodeproj";  
  var newProjDir = destDir + "/" + appName + ".xcodeproj";
  console.log("Copying source from" + oldProjDir + " to directory " + newProjDir);
  fs.renameSync(oldProjDir, newProjDir);
}

function removeGitModuleFiles(destDir) {
  var git = destDir + '/.git';
  var gitIgnore = destDir + '/.gitignore';
  
  fs.unlinkSync(git);
  fs.unlinkSync(gitIgnore);
}

String.prototype.endsWith = function(input) {
  return this.indexOf(input, this.length - input.length) !== -1;
};

String.prototype.fileNameStartsWith = function(prefix) {
    // Get fill name parts
    var parts = this.split('/');
    var fileName = parts[parts.length - 1];
    console.log('fileNameStartsWith: ' + fileName);
    return fileName.indexOf(prefix, 0) === 0;
};

