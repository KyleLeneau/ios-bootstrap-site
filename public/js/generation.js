$(function(){
  
  $("#generate-app").click(function() {
    
    var appName = $("#appName"); 
    var bundleId = $("#bundleId");
    var classPrefix = $("#classPrefix");

    if(appName && appName.val().length > 0 
      && bundleId && bundleId.val().length > 0 && bundleIdIsDomain(bundleId.val())
      && classPrefix && classPrefix.val().length > 0
      ) {
      $(location).attr('href', '/generate?appName=' + appName.val() + "&bundleId=" + bundleId.val() + '&classPrefix=' + classPrefix.val());
    } else {
      alert("Please enter a bundle id and app name.");
    }

  });

});

function bundleIdIsDomain(bundleIdValue) {
  // Validate a package name. Source: http://stackoverflow.com/a/10428964/5210
  var domainRegEx = new RegExp("^([a-zA-Z_]{1}[a-zA-Z0-9_]*(\\.[a-zA-Z_]{1}[a-zA-Z0-9_]*)*)?$"); 
  return domainRegEx.test(bundleIdValue);
}