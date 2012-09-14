$(function(){
  
  $("#generate-app").click(function() {
    
    var appName = $("#appName"); 
    var packageName = $("#packageName");

    if(appName && appName.val().length > 0 && packageName && packageName.val().length > 0 && packageNameIsDomain(packageName.val())) {
      $(location).attr('href', '/generate?appName=' + appName.val() + "&packageName=" + packageName.val());
    } else {
      alert("Please enter a valid package name and app name.");
    }

  });

});

function packageNameIsDomain(packageNameValue) {
  // Validate a package name. Source: http://stackoverflow.com/a/10428964/5210
  var domainRegEx = new RegExp("^([a-zA-Z_]{1}[a-zA-Z0-9_]*(\\.[a-zA-Z_]{1}[a-zA-Z0-9_]*)*)?$"); 
  return domainRegEx.test(packageNameValue);
}