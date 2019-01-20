/*
 * Copyright 2018 The CodeWorld Authors. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * Utility function for sending an HTTP request to fetch a resource.
 *
 * Args:
 *   - method: The HTTP method to use, such as 'GET'
 *   - url: The URL to fetch, whether absolute or relative.
 *   - body: The request body to send.  Use null for no body.
 *   - callback: A callback function to send when complete.  (optional)
 *
 * If provided, the callback will be given the XmlHttpRequest object, so
 * it can inspect the response code and headers as well as the contents.
 */
function sendHttp(method, url, body, callback) {
    const sendHttpFunc = signedIn() ? window.auth2.sendHttpAuth : sendHttpRaw;
    return sendHttpFunc(method, url, body, callback);
}

function sendHttpRaw(method, url, body, callback) {
    var request = new XMLHttpRequest();

    if (callback) {
        request.onreadystatechange = function() {
            if (request.readyState == 4) callback(request);
        };
    }

    request.open(method, url, true);
    request.send(body);
}

var Html = (() => {
  const mine = {};

  mine.encode = str => $("<div/>").text(str).html();

  return mine;
})();

var Alert = (() => {
  const mine = {};

  // Load SweetAlert2 and SweetAlert in correct order
  mine.init = () =>
    Promise.resolve($.getScript("https://cdnjs.cloudflare.com/ajax/libs/limonte-sweetalert2/7.19.2/sweetalert2.all.min.js"))
      .then(() => {
        window.sweetAlert2 = window.sweetAlert;
        return $.getScript("https://cdnjs.cloudflare.com/ajax/libs/sweetalert/1.1.0/sweetalert.min.js");
      })
      .catch(e => console.log("Alert.init failed"));

  // Build SweetAlert title HTML
  mine.title = (text, iconClass) => `<i class="mdi mdi-72px ${iconClass}"></i>&nbsp; ${Html.encode(text)}`;

  return mine;
})();

var hintBlacklist = [
    // Symbols that only exist to implement RebindableSyntax or map to
    // built-in Haskell types.
    "Bool",
    "IO",
    "fail",
    "fromCWText",
    "fromDouble",
    "fromInt",
    "fromInteger",
    "fromRational",
    "fromString",
    "ifThenElse",
    "toCWText",
    "toDouble",
    "toInt",

    // Deprecated exports.
    "MousePress",
    "MouseRelease",
    "MouseMovement",
    "MouseButton",
    "LeftButton",
    "RightButton",
    "MiddleButton",
    "Maybe",
    "Nothing",
    "Just",
    "withDefault",
    "hasValue",
    "definitely",
    "path",
    "thickPath",
    "text",
    "styledText",

    // Experimental exports.
    "White",
    "Black",
    "Gray",
    "Grey",
    "Red",
    "Orange",
    "Yellow",
    "Green",
    "Blue",
    "Purple",
    "Pink",
    "Brown",
    "Pi",
];

var codeWorldBuiltinsDocs = {};

function onHover(cm, data, node){
    if (data && data.token && data.token.string) {
        var token_name = data.token.string;
        if (hintBlacklist.indexOf(token_name) == -1 && codeWorldBuiltinsDocs[token_name]){
            return codeWorldBuiltinsDocs[token_name];
        }
    }
    return;
}

// Hints and hover tooltips
function registerStandardHints(successFunc)
{
    function createHint(line, wordStart, wordEnd, cname) {
        var word = line.slice(wordStart, wordEnd);
        if (!cname) cname = 'hint-word';

        function renderer(elem, data, cur) {
            if (wordStart > 0) {
                elem.appendChild(document.createTextNode(line.slice(0, wordStart)));
            }
            var wordElem = document.createElement("span");
            wordElem.className = cname;
            wordElem.appendChild(document.createTextNode(word));
            elem.appendChild(wordElem);
            if (wordEnd < line.length) {
                var leftover = line.slice(wordEnd).replace(/\s+/g, ' ');
                if (wordEnd + leftover.length > 60 && leftover.length > 3) {
                  leftover = leftover.slice(0, 57 - wordEnd) + '...';
                }
                elem.appendChild(document.createTextNode(leftover));
                elem.title = line;
            }
        }
        return {
            text: word,
            render: renderer,
            source: line
        };
    }

    function createHover(line, wordStart, wordEnd, doc, hint){
        if (!hint){
            hint = createHint(line, wordStart, wordEnd);
        }

        var topDiv = document.createElement('div');

        var docDiv = document.createElement('div');
        var annotation = document.createElement('div');
        hint.render(annotation);
        annotation.className = "hover-decl";
        docDiv.appendChild(annotation);

        if (doc !== "") {
            var description = document.createElement('div');
            description.innerHTML = doc;
            description.className = " hover-doc";
            docDiv.appendChild(description);
        }

        var fadeDiv = document.createElement('div');
        fadeDiv.className = 'fade';

        topDiv.appendChild(docDiv);
        topDiv.appendChild(fadeDiv);
        return topDiv;
    }

    // Add hint highlighting
    var hints = [
        createHint("program :: Program", 0, 7),
        createHint("(:) :: a -> [a] -> [a]", 1, 2)
    ];

    function sortHints(list) {
        list.sort(function(a, b) {
            function startsWithLetter(c) {
                return /^[a-zA-Z].*/.test(c);
            }

            if (startsWithLetter(a.text) && !startsWithLetter(b.text)) return -1;
            else if (startsWithLetter(b.text) && !startsWithLetter(a.text)) return 1;
            else return a.text.toLowerCase() < b.text.toLowerCase() ? -1 : 1
        });
    }

    CodeMirror.registerHelper('hint', 'codeworld', function(cm) {
        var cur = cm.getCursor();
        var token = cm.getTokenAt(cur);

        // If the current token is whitespace, it can be split.
        if (/^\s+$/.test(token.string)) {
            var term = "";
            var from = cur;
        } else {
            var term = token.string.substr(0, cur.ch - token.start);
            var from = CodeMirror.Pos(cur.line, token.start);
        }

        var found = [];

        for (var i = 0; i < hints.length; i++) {
            var hint = hints[i];
            if (hint.text.startsWith(term)) {
                found.push(hint);
            }
        }

        var lines = cm.getValue().split("\n");
        for (var i=0; i < lines.length; i++) {
            if (/^\S*\s*::[^:]*$/.test(lines[i])) {
                var candidate = lines[i].split(" ::")[0];
                if (candidate.startsWith(term)) {
                    found.push(createHint(lines[i], 0, candidate.length));
                }
            }
        }

        sortHints(found);

        if (found.length > 0) return {
            list: found,
            from: from,
            to: cur
        };
    });

    sendHttp('GET', 'codeworld-base.txt', null, function(request) {
    var lines = [];
    if (request.status != 200) {
        console.log('Failed to load autocomplete word list.');
    } else {
        lines = request.responseText.split('\n');
    }

    var startLine = lines.indexOf('module Prelude') + 1;
    var endLine = startLine;
    while (endLine < lines.length) {
        if (lines[endLine].startsWith("module ")) {
            break;
        }
        endLine++;
    }
    lines = lines.slice(startLine, endLine);

    // Special case for "main" and "program", since they are morally
    // built-in names.
    codeworldKeywords['main'] = 'deprecated';
    codeworldKeywords['program'] = 'builtin';

    codeWorldBuiltinsDocs['program'] = createHover('program :: Program', 0, 7, 'Your program.');

    var doc = "";
    var prevLine = "";
    lines.forEach(function(line) {
        if (!prevLine.startsWith("--")) doc = "";
        prevLine = line;

        if (line.startsWith("type Program")) {
            // We must intervene to hide the IO type.
            line = "data Program";
        } else if (line.startsWith("type Truth")) {
            line = "data Truth";
        } else if (line.startsWith("True ::")) {
            line = "True :: Truth";
        } else if (line.startsWith("False ::")) {
            line = "False :: Truth";
        } else if (line.startsWith("newtype ")) {
            // Hide the distinction between newtype and data.
            line = "data " + line.substr(8);
        } else if (line.startsWith("pattern ")) {
            // Hide the distinction between patterns and constructors.
            line = line.substr(8);
        } else if (line.startsWith("class ")) {
            return;
        } else if (line.startsWith("instance ")) {
            return;
        } else if (line.startsWith("infix ")) {
            return;
        } else if (line.startsWith("infixl ")) {
            return;
        } else if (line.startsWith("infixr ")) {
            return;
        }

        // Filter out strictness annotations.
        line = line.replace(/(\s)!([A-Za-z\(\[])/g, '$1$2');

        // Filter out CallStack constraints.
        line = line.replace(/:: HasCallStack =>/g, '::');

        if (line.startsWith("-- |")) {
            doc = line.replace(/\-\- \| /g, "") + "\n";
        } else if (doc != "" && line.startsWith("-- ")){
            doc += line.replace(/\-\-   /g, "") + "\n";
        } else {
            var wordStart = 0;
            if (line.startsWith("type ") || line.startsWith("data ")) {
                wordStart += 5;

                // Hide kind annotations.
                var kindIndex = line.indexOf(" ::");
                if (kindIndex != -1) {
                    line = line.substr(0, kindIndex);
                }
            }

            var wordEnd = line.indexOf(" ", wordStart);
            if (wordEnd == -1) {
                wordEnd = line.length;
            }
            if (wordStart == wordEnd) {
                return;
            }

            if (line[wordStart] == "(" && line[wordEnd - 1] == ")") {
                wordStart++;
                wordEnd--;
            }

            var word = line.substr(wordStart, wordEnd - wordStart);
            var hint = createHint(line, wordStart, wordEnd);
            codeWorldBuiltinsDocs[word] = createHover(line, wordStart, wordEnd, doc, hint)
            if (hintBlacklist.indexOf(word) >= 0) {
                codeworldKeywords[word] = 'deprecated';
            } else if (/^[A-Z:]/.test(word)) {
                codeworldKeywords[word] = 'builtin-2';
                hints.push(hint);
            } else {
                codeworldKeywords[word] = 'builtin';
                hints.push(hint);
            }
        }
    });

    sortHints(hints);
    CodeMirror.registerHelper('hintWords', 'codeworld', hints);
    successFunc();
  });
}

function addToMessage(msg) {
    while (msg.match(/(\r\n|[^\x08]|)\x08/)) {
        msg = msg.replace(/(\r\n|[^\x08])\x08/g, "");
    }

    msg = msg
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/program\.hs:(\d+):((\d+)(-\d+)?)/g,
            '<a href="#" onclick="goto($1, $3);">Line $1, Column $2</a>')
        .replace(/program\.hs:\((\d+),(\d+)\)-\((\d+),(\d+)\)/g,
            '<a href="#" onclick="goto($1, $2);">Line $1-$3, Column $2-$4</a>');

    var message = document.getElementById('message');
    var atEnd = message.scrollTop >= message.scrollHeight - message.clientHeight;
    message.innerHTML += msg;
    if (atEnd) message.scrollTop = message.scrollHeight;
}

function signin() {
    if (window.auth2) auth2.signIn({prompt: 'login'});
}

function signout() {
    if (window.auth2) auth2.signOut();
}

function signedIn() {
    return !!(window.auth2 && auth2.isSignedIn.get());
}

var Auth = (() => {
  const mine = {};

  function initLocalAuth() {
    Promise.resolve($.getScript("/js/codeworld_local_auth.js"))
      .then(() => onAuthInitialized(LocalAuth.init()))
      .catch(e => console.log("initLocalAuth failed"));
  }

  function initGoogleAuth() {
    Promise.resolve($.getScript("https://apis.google.com/js/platform.js"))
      .then(() => gapi.load("auth2", () =>
        withClientId(clientId => {
          function sendHttpAuth(method, url, body, callback) {
            if (body != null && signedIn()) {
              const idToken = window.auth2.currentUser.get().getAuthResponse().id_token;
              body.append("id_token", idToken);
            }

            const request = new XMLHttpRequest();

            if (callback) {
              request.onreadystatechange = () => {
                if (request.readyState == 4) {
                  callback(request);
                }
              };
            }

            request.open(method, url, true);
            request.send(body);
          }

          const auth2 = Object.assign({ sendHttpAuth: sendHttpAuth }, gapi.auth2.init({
            client_id: clientId,
            scope: 'profile',
            fetch_basic_profile: false
          }));

          onAuthInitialized(auth2);
        })
      ))
      .catch(e => console.log("initGoogleAuth failed"));
  }

  function onAuthInitialized(auth) {
    window.auth2 = auth;
    auth2.currentUser.listen(signinCallback);

    if (auth2.isSignedIn.get()) {
      auth2.signIn();
    }

    discoverProjects("", 0);
    updateUI();
  }

  function onAuthDisabled() {
    window.auth2 = null;
    document.getElementById("signin").style.display = "none";
    discoverProjects("", 0);
    updateUI();
  }

  mine.init = () =>
    sendHttp("GET", "authMethod", null, resp => {
      if (resp.status == 200) {
        const obj = JSON.parse(resp.responseText);
        switch (obj.authMethod) {
          case "Local":
            initLocalAuth();
            break;
          case "Google":
            initGoogleAuth();
            break;
          default:
            onAuthDisabled();
            break;
        }
      }
      else {
        onAuthDisabled();
      }
    });

  return mine;
})();

function withClientId(f) {
    if (window.clientId) return f(window.clientId);

    sendHttp('GET', 'clientId.txt', null, function(request) {
        if (request.status != 200 || request.responseText == '') {
            sweetAlert('Oops!', 'Missing API client key.  You will not be able to sign in.', 'warning');
            return null;
        }

        window.clientId = request.responseText.trim();
        return f(window.clientId);
    });
}

function discoverProjects_(path, buildMode, index) {
    if (!signedIn()) {
        allProjectNames = window.openProjectName ? [[window.openProjectName]] : [[]];
        allFolderNames = [[]];
        nestedDirs = [""];
        cancelMove();
        updateUI();
        return;
    }

    var data = new FormData();
    data.append('mode', buildMode);
    data.append('path', path);

    sendHttp('POST', 'listFolder', data, function(request) {
        if (request.status == 200) {
            loadingDir = false;
            var allContents = JSON.parse(request.responseText);
            allProjectNames[index] = allContents['files'];
            allFolderNames[index] = allContents['dirs'];
        }
        updateNavBar();
    });

    window.loadingDir = true;
}

function moveHere_(path, buildMode, successFunc) {
    if (!signedIn()) {
        sweetAlert('Oops!', 'You must sign in before moving.', 'error');
        cancelMove();
        return;
    }

    if (!window.move) {
        sweetAlert('Oops!', 'You must first select something to move.', 'error');
        cancelMove();
        return;
    }

    var data = new FormData();
    data.append('mode', buildMode);
    data.append('moveTo', path);
    data.append('moveFrom', window.move.path);
    if (window.move.file) {
        data.append('isFile', "true");
        data.append('name', window.move.file);
    } else {
        if (path.startsWith(window.move.path)) {
            sweetAlert('Oops!', 'You cannot move a path to a location inside itself.', 'error');
            cancelMove();
            return;
        }
        data.append('isFile', "false");
    }

    sendHttp('POST', 'moveProject', data, function(request) {
        if (request.status != 200) {
            sweetAlert('Oops', 'Could not move your project! Please try again.', 'error');
            cancelMove();
            return;
        }
        successFunc();
    });
}

function cancelMove() {
  window.move = null;
  updateUI();
}

function warnIfUnsaved(action, showAnother) {
    if (isEditorClean()) {
        action();
    } else {
        var msg = 'There are unsaved changes to your project. ' + 'Continue and throw away your changes?';
        sweetAlert({
            title: 'Warning',
            text: msg,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DD6B55',
            confirmButtonText: 'Yes, discard my changes!',
            closeOnConfirm: !showAnother
        }, action);
    }
}

function saveProjectAs() {
    if (!signedIn()) {
        sweetAlert('Oops!', 'You must sign in to save files.', 'error');
        updateUI();
        return;
    }

    var text;
    if (nestedDirs.length > 1) {
      text = 'Enter a name for your project in folder <b>' +
          $('<div>').text(nestedDirs.slice(1).join('/')).html().replace(/ /g, '&nbsp;') +
          ':';
    } else {
      text = 'Enter a name for your project:';
    }

    var defaultName;
    if (window.openProjectName) {
        defaultName = window.openProjectName;
    } else {
        defaultName = '';
    }

    function go(projectName) {
        saveProjectBase(nestedDirs.slice(1).join('/'), projectName);
    }

    sweetAlert({
        html: true,
        title: '<i class="mdi mdi-72px mdi-cloud-upload"></i>&nbsp; Save As',
        text: text,
        type: 'input',
        inputValue: defaultName,
        confirmButtonText: 'Save',
        showCancelButton: true,
        closeOnConfirm: false
    }, go);
}

function saveProject() {
    if (!signedIn()) {
        sweetAlert('Oops!', 'You must sign in to save files.', 'error');
        updateUI();
        return;
    }

    if (window.openProjectName) {
        saveProjectBase(nestedDirs.slice(1).join('/'), openProjectName);
    } else {
        saveProjectAs();
    }
}

function saveProjectBase_(path, projectName, mode, successFunc) {
    if (projectName == null || projectName == '') return;

    if (!signedIn()) {
        sweetAlert('Oops!', 'You must sign in to save files.', 'error');
        updateUI();
        return;
    }

    function go() {
        sweetAlert.close();
        sweetAlert2({
            title: 'Saving ' + projectName + '...',
            text: 'Saving your project.  Please wait.',
            showConfirmButton: false,
            showCancelButton: false,
            showCloseButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: false
        });

        var project = getCurrentProject();
        project['name'] = projectName;

        var data = new FormData();
        data.append('project', JSON.stringify(project));
        data.append('mode', mode);
        data.append('path', path);

        sendHttp('POST', 'saveProject', data, function(request) {
            sweetAlert2.close();
            if (request.status != 200) {
                sweetAlert('Oops!', 'Could not save your project!!!  Please try again.', 'error');
                return;
            }

            successFunc();
            cancelMove();
            updateUI();

            if (allProjectNames[allProjectNames.length - 1].indexOf(projectName) == -1) {
                discoverProjects(path, allProjectNames.length - 1);
            }
        });
    }

    if (allProjectNames[allProjectNames.length - 1].indexOf(projectName) == -1 || projectName == openProjectName) {
        go();
    } else {
        var msg = 'Are you sure you want to save over another project?\n\n' +
            'The previous contents of ' + projectName + ' will be permanently destroyed!';
        sweetAlert({
            title: 'Warning',
            text: msg,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#DD6B55',
            confirmButtonText: 'Yes, overwrite it!'
        }, go);
    }
}

function deleteProject_(path, buildMode, successFunc) {
    if (!window.openProjectName) return;

    if (!signedIn()) {
        sweetAlert('Oops', 'You must sign in to delete a project.', 'error');
        updateUI();
        return;
    }

    function go() {
        var data = new FormData();
        data.append('name', window.openProjectName);
        data.append('mode', buildMode);
        data.append('path', path);

        sendHttp('POST', 'deleteProject', data, function(request) {
            if (request.status == 200) {
                successFunc();
                discoverProjects(path, allProjectNames.length - 1);
            }
        });
    }

    var msg = 'Deleting a project will throw away all work, and cannot be undone. ' + 'Are you sure?';
    sweetAlert({
        title: 'Warning',
        text: msg,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, delete it!'
    }, go);
}

function deleteFolder_(path, buildMode, successFunc) {
    if(path == "" || window.openProjectName != null) {
        return;
    }
    if(!signedIn()) {
        sweetAlert('Oops', 'You must sign in to delete a folder.', 'error');
        updateUI();
        return;
    }

    function go() {
        var data = new FormData();
        data.append('mode', buildMode);
        data.append('path', path);

        sendHttp('POST', 'deleteFolder', data, function(request) {
            if (request.status == 200) {
                successFunc();
                nestedDirs.pop();
                allProjectNames.pop();
                allFolderNames.pop();
                discoverProjects(nestedDirs.slice(1).join('/'), allProjectNames.length - 1);
            }
        });
    }

    var msg = 'Deleting a folder will throw away all of its content, cannot be undone. ' + 'Are you sure?';
    sweetAlert({
        title: 'Warning',
        text: msg,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, delete it!'
    }, go);
}

function createFolder(path, buildMode, successFunc) {
    warnIfUnsaved(function() {
        if(!signedIn()) {
            sweetAlert('Oops!', 'You must sign in to create a folder.', 'error');
            updateUI();
            return;
        }

        function go(folderName) {
            if(folderName == null || folderName == '') {
                return;
            }

            sweetAlert.close();
            var data = new FormData();
            data.append('mode', buildMode);
            if (path == "")
                data.append('path', folderName);
            else
                data.append('path', path + '/' + folderName);

            sendHttp('POST', 'createFolder', data, function(request) {
                if (request.status != 200) {
                    sweetAlert('Oops', 'Could not create your directory! Please try again.', 'error');
                    return;
                }

                allFolderNames[allFolderNames.length - 1].push(folderName);
                nestedDirs.push(folderName);
                allFolderNames.push([]);
                allProjectNames.push([]);
                successFunc();
                updateNavBar();
            });
        }

        sweetAlert({
            html: true,
            title: '<i class="mdi mdi72px mdi-folder-plus"></i>&nbsp; Create Folder',
            text: 'Enter a name for your folder:',
            type: 'input',
            inputValue: '',
            confirmButtonText: 'Create',
            showCancelButton: true,
            closeOnConfirm: false
        }, go);
    }, true);
}

function loadProject_(index, name, buildMode, successFunc) {

  warnIfUnsaved(function(){
    if (!signedIn()) {
        sweetAlert('Oops!', 'You must sign in to open projects.', 'error');
        updateUI();
        return;
    }

    var data = new FormData();
    data.append('name', name);
    data.append('mode', buildMode);
    data.append('path', nestedDirs.slice(1, index + 1).join('/'));

    sendHttp('POST', 'loadProject', data, function(request) {
        if (request.status == 200) {
            var project = JSON.parse(request.responseText);

            successFunc(project);
            window.nestedDirs = nestedDirs.slice(0, index + 1);
            window.allProjectNames = allProjectNames.slice(0, index + 1);
            window.allFolderNames = allFolderNames.slice(0, index + 1);
            cancelMove();
            updateUI();
        }
    });
  }, false);
}

function share() {
  var offerSource = true;

  function go() {
    var url;
    var msg;
    var showConfirm;
    var confirmText;

    if (!window.deployHash) {
      url = window.location.href;
      msg = 'Copy this link to share your program and code with others!';
      showConfirm = false;
    } else if (offerSource) {
      url = window.location.href;
      msg = 'Copy this link to share your program and code with others!';
      showConfirm = true;
      confirmText = 'Share Without Code';
    } else {
      var a = document.createElement('a');
      a.href = window.location.href;
      a.hash = '';
      a.pathname = '/run.html'
      a.search = '?mode=' + window.buildMode + '&dhash=' + window.deployHash;

      url = a.href;
      msg = 'Copy this link to share your program (but not code) with others!';
      showConfirm = true;
      confirmText = 'Share With Code';
    }

    sweetAlert({
        html: true,
        title: '<i class="mdi mdi-72px mdi-share"></i>&nbsp; Share',
        text: msg,
        type: 'input',
        inputValue: url,
        showConfirmButton: showConfirm,
        confirmButtonText: confirmText,
        closeOnConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'Done',
        animation: 'slide-from-bottom'
    }, function() {
      offerSource = !offerSource;
      go();
    });
  }

  if (window.runningGeneration) {
    if (!window.codeworldEditor.getDoc().isClean(window.runningGeneration)) {
      sweetAlert2({
        type: 'warning',
        text: 'You have changed your code since running the program. ' +
              ' Rebuild so that you can share your latest code?',
        confirmButtonText: 'Yes, Rebuild',
        cancelButtonText: 'No, Share Old Program',
        showConfirmButton: true,
        showCancelButton: true
      }).then((result) => {
        if (result.dismiss == sweetAlert2.DismissReason.cancel) {
          go();
        } else if (result.value) {
          compile();
        }
      });
      return;
    }
  }

  go();
}

function inspect() {
    document.getElementById('runner').contentWindow.toggleDebugMode();
    cancelMove();
    updateUI();
}

function shareFolder_(mode) {
    if(!signedIn()) {
        sweetAlert('Oops!', 'You must sign in to share your folder.', 'error');
        updateUI();
        return;
    }
    if(nestedDirs.length == 1 || (openProjectName != null && openProjectName != '')) {
        sweetAlert('Oops!', 'YOu must select a folder to share!', 'error');
        updateUI();
        return;
    }
    var path = nestedDirs.slice(1).join('/');

    function go() {
        var msg = 'Copy this link to share your folder with others!';

        var data = new FormData();
        data.append('mode', mode);
        data.append('path', path);
 
        sendHttp('POST', 'shareFolder', data, function(request) {
            if(request.status != 200) {
                sweetAlert('Oops!', 'Could not share your folder! Please try again.', 'error');
                return;
            }

            var shareHash = request.responseText;
            var a = document.createElement('a');
            a.href = window.location.href;
            a.hash = '#' + shareHash;
            var url = a.href;
            sweetAlert({
                html: true,
                title: '<i class="mdi mdi-72px mdi-folder-outline"></i>&nbsp; Share Folder',
                text: msg,
                type: 'input',
                inputValue: url,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Done',
                animation: 'slide-from-bottom'
            });
        });
    }

    go();
}
