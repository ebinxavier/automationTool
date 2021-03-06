
// chrome.storage.sync.get('color', function(data) {
//   changeColor.style.backgroundColor = data.color;
//   changeColor.setAttribute('value', data.color);
//   codeBox.setAttribute('value', "data.color");

//   document.getElementById("codeBox").value=""
// });




var app = angular.module("myApp", ['jsonFormatter']);

app.controller("myCtrl", function ($scope, $http) {

  $scope.response = null;
  $scope.checks = [];
  $scope.currentInstructionCount = 0;
  $scope.locator = 'id';
  $scope.generator = {};
  $scope.inputs={};
  $scope.generatePageFlag = true;
  $scope.changeLocator = function (currentInstruction, locator) {
    $scope.response[$scope.currentInstructionCount] = angular.copy($scope.currentInstruction);
    console.log(locator);
  }

  $scope.fetchApi = function () {
    // console.log($scope.inputs);
    $scope.loading = true;
    $http.get("https://atomic.incfile.com/api/webauto/misc-order/" + $scope.generator.state + "/llc?id=" + $scope.generator.order)
      .then(function (response) {
        $scope.loading = false;
        $scope.api = response.data;
        $scope.apiKeys = getNestedJsonKeys(response.data);

        $scope.generatePageFlag = false;

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "getText", elements:$scope.inputs }, function (resp) {

            $scope.response = resp;
            console.log("response from Page: ", resp);
            if (!resp || !resp.length) {
              alert("No fields found");
              console.error("No fields found");
            }
            else {
              $scope.currentInstruction = $scope.response[$scope.currentInstructionCount];
              makeDefaultLocator($scope.currentInstruction);
              if ($scope.currentInstruction.type=='dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";
              makeBorder(true, getLocator($scope.currentInstruction));
              $scope.$apply();
            }

          });
        });
      });
  }

  function getNestedJsonKeys(apiObj) {
    var ops = [];
    function iterate(obj, parents = "") {
      if (typeof obj != "object") {
        ops.push({ key: parents, val: obj });
        return;
      }
      for (var key in obj) {
        iterate(obj[key], parents != "" ? (parents + (!isNaN(key) ? "[" : ".") + key + (!isNaN(key) ? "]" : "")) : key);
      }
    }
    iterate(apiObj);
    return ops;
  }
  $scope.setApiValue = function () {
    $scope.currentInstruction.value = 'orderdata.' + $scope.api.apiValue.split(" ").join("");
    $scope.api.apiString = '';
  }

  function getLocator(obj) {
    return obj.locator;
  }
  function makeBorder(condition, locator) {  // set / reset
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "changeDom", set: condition, locator }, function (resp) {
        // resp got from content.js 
      });
    });
  }

  $scope.goBack = function () {
    $scope.generatePageFlag = true;
  }
  function makeDefaultLocator(currentInstruction) {
    if (!currentInstruction.selectedLocator) {
      if (!!currentInstruction.locator.id)
        currentInstruction.selectedLocator = "id";
      else if (!!currentInstruction.locator.name)
        currentInstruction.selectedLocator = "name";
      else if (!!currentInstruction.locator.xpath)
        currentInstruction.selectedLocator = "xpath";
    }
  }
  $scope.next = function () {
    $scope.api.apiValue="";
    $scope.api.currentApiValue=null;
    makeBorder(false, getLocator($scope.currentInstruction));
    $scope.currentInstruction = $scope.response[++$scope.currentInstructionCount];
    makeDefaultLocator($scope.currentInstruction);
    if ($scope.currentInstruction.type=='dropDownClick' && !$scope.currentInstruction.dropdownMethod) $scope.currentInstruction.dropdownMethod = "value";    
    // alert($scope.currentInstruction.type);
    makeBorder(true, getLocator($scope.currentInstruction));
  }
  $scope.previous = function () {
    $scope.api.apiValue="";
    $scope.api.currentApiValue=null;
    makeBorder(false, getLocator($scope.currentInstruction));
    $scope.currentInstruction = $scope.response[--$scope.currentInstructionCount];
    makeBorder(true, getLocator($scope.currentInstruction));
  }


  $scope.generateInstructions = function () {
    $scope.generation = {};
    $scope.instructions = $scope.response.filter(currentInstruction => currentInstruction.enabled)
      .map(currentInstruction => {
        switch (currentInstruction.type) {
          case 'textInput':
            let textEntry = {
              "type": "textEntry",
              "optional": false,
              "param": {
                "locator": {},
                "value": {}
              },
              "auto": true
            }

            textEntry.auto = currentInstruction.auto;
            textEntry.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            textEntry.param.value = currentInstruction.value;
            return textEntry;
          case 'elementClick':
            elementClick = {
              "type": "elementClick",
              "optional": false,
              "param": {},
              "auto": false
            }
            elementClick.auto = currentInstruction.auto;
            elementClick.param[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            return elementClick;
          case 'dropDownClick':

            dropDownClick = {
              "type": "dropDownClick",
              "optional": false,
              "param": {
                "locator": {},
              },
              "auto": true
            }
            dropDownClick.auto = currentInstruction.auto;
            dropDownClick.param.locator[currentInstruction.selectedLocator] = currentInstruction.locator[currentInstruction.selectedLocator];
            if (currentInstruction.dropdownMethod == 'value')
              dropDownClick.param.value = currentInstruction.value;
            else
              dropDownClick.param.text = currentInstruction.value;
            return dropDownClick;
        }
      })

    console.log($scope.instructions)
    $scope.generation.instructionsGenerated = true;

  }
  $scope.copyToClipBoard = function () {
    var input = document.createElement("textarea");
    input.setAttribute("style", "width: 0;height: 0;opacity: 0;position: absolute;");
    input.setAttribute("id", "jsonText");
    input.value = JSON.stringify($scope.instructions);;
    document.body.appendChild(input);
    var copyText = document.getElementById("jsonText");
    copyText.select();
    document.execCommand("copy");
    $scope.generation.copied = true;
  }

  $scope.displayApiValue = function () {
    var currentApiValue;
    if ($scope.apiKeys.some(e => {
      if (e.key == $scope.api.apiValue) {
        currentApiValue = e.val;
        return true;
      }
    }))
      $scope.api.currentApiValue = currentApiValue;
    else $scope.api.currentApiValue = false;
  }

})







