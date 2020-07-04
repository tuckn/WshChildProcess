/* globals Wsh: false */
/* globals __dirname: false */
/* globals process: false */

(function () {
  if (Wsh && Wsh.ChildProcess) return;

  /**
   * This module provides the ability to spawn child processes (similar to Node.js Child Process).
   *
   * @namespace ChildProcess
   * @memberof Wsh
   * @requires {@link https://github.com/tuckn/WshProcess|tuckn/WshProcess}
   */
  Wsh.ChildProcess = {};

  // Shorthands
  var CD = Wsh.Constants;
  var util = Wsh.Util;
  var fso = Wsh.FileSystemObject;
  var path = Wsh.Path;
  var os = Wsh.OS;
  var fs = Wsh.FileSystem;
  var fse = Wsh.FileSystemExtra;

  var objAssign = Object.assign;
  var insp = util.inspect;
  var obtain = util.obtainPropVal;
  var isArray = util.isArray;
  var isString = util.isString;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var hasContent = util.hasContent;
  var isSameStr = util.isSameMeaning;
  var srrPath = os.surroundPath;

  var child_process = Wsh.ChildProcess;

  /** @constant {string} */
  var MODULE_TITLE = 'WshModeJs/ChildProcess.js';

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  // child_process.splitCommand {{{
  /**
   * @typedef {object} typeSpliteCommandReturn
   * @property {string} mainCmd - The main command part.
   * @property {string} argsStr - The arguments part.
   */

  /**
   * Split the command into main part and arguments.
   *
   * @example
   * var splitCommand = Wsh.ChildProcess.splitCommand; // Shorthand
   *
   * splitCommand('"C:\\My Apps\\test.exe"');
   * // Returns:
   * // { mainCmd: 'C:\\My Apps\\test.exe'
   * //   argsStr: '' }
   *
   * splitCommand('"C:\\My Apps\\test.exe" -s "fileName"');
   * // Returns:
   * // { mainCmd: 'C:\\My Apps\\test.exe'
   * //   argsStr: '-s "fileName"' }
   *
   * splitCommand('mklink /D "filePath2" filePath1');
   * // Returns:
   * // { mainCmd: 'mklink'
   * //   argsStr: '/D "filePath2" filePath1' }
   * @function splitCommand
   * @memberof Wsh.ChildProcess
   * @param {string} command - The command to split.
   * @returns {typeSpliteCommandReturn}
   */
  child_process.splitCommand = function (command) {
    var functionName = 'child_process.splitCommand';
    if (!isSolidString(command)) throwErrNonStr(functionName, command);

    var mainCmd;
    var argsStr = '';

    command = command.trim();

    // Ex1. '"C:\\My Apps\\test.exe"'
    // Ex2. '"C:\\My Apps\\test.exe" -s "fileName"'
    // Ex3. '"C:\\apps\\test.exe" -s fileName'
    if (command.indexOf('"') === 0) {
      var posCloseDq = command.indexOf('"', 1);

      if (posCloseDq === -1) {
        throw new Error('Error [Failed to parse] command: ' + command + '\n'
          + '  at ' + functionName + ' (' + MODULE_TITLE + ')');
      }

      mainCmd = command.slice(1, posCloseDq);

      if (command.length > posCloseDq) {
        argsStr = command.slice(posCloseDq + 2);
      }

      return { mainCmd: mainCmd, argsStr: argsStr };
    }

    var pos1stSpace = command.indexOf(' ');

    // Ex. 'C:\\apps\\test.exe'
    // Ex. 'dir'
    if (pos1stSpace === -1) {
      return { mainCmd: command, argsStr: argsStr };
    }

    // Ex. C:\\apps\\test.exe -s "fileName"
    // Ex. mklink /D filePath2 filePath1
    mainCmd = command.slice(0, pos1stSpace);

    if (command.length > pos1stSpace) {
      argsStr = command.slice(pos1stSpace + 1);
    }

    return { mainCmd: mainCmd, argsStr: argsStr };
  }; // }}}

  // _run {{{
  /**
   * Asynchronously executes the command. The function to be executed is one of os.run, os.runAsAdmin and os.Task.runTemporary.
   *
   * @private
   * @param {string} cmdStr
   * @param {string[]} [args]
   * @param {object} [options] - See {@link https://docs.tuckn.net/WshOS/Wsh.OS.html#.run|Wsh.OS.run}
   * @returns {(0|void)} - Always 0 or undefined
   */
  function _run (cmdStr, args, options) {
    var functionName = '_run';
    if (!isSolidString(cmdStr)) throwErrNonStr(functionName, cmdStr);

    var runsAdmin = obtain(options, 'runsAdmin', null);

    try {
      if (runsAdmin === true && !process.isAdmin()) {
        return os.runAsAdmin(cmdStr, args, options);
      } else if (runsAdmin === false && process.isAdmin()) {
        return os.Task.runTemporary(cmdStr, args, options);
      } else {
        return os.run(cmdStr, args, options);
      }
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }
  } // }}}

  // child_process.exec {{{
  /**
   * Asynchronously executes the command within CommandPrompt. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback|Node.js child_process.exec()}.
   *
   * @example
   * // Use Case: DOS commands or CUI applications that do not require processing results
   * var exec = Wsh.ChildProcess.exec; // Shorthand
   *
   * // Asynchronously create the directory
   * exec('mkdir C:\\Tuckn\\test');
   * exec('mkdir C:\\My Apps\\test'); // NG
   * exec('mkdir "C:\\My Apps\\test"'); // OK
   *
   * // Asynchronously create the symbolick-link in D:\Temp
   * exec('mklink D:\\Temp\\hoge-Symlink "C:\\My Foo\\hoge"', { runsAdmin: true });
   *
   * // Note: Asynchronous behavior
   * var fs = Wsh.FileSystem;
   *
   * fs.existsSync('C:\\Tuckn\\test'); // Returns: false
   * exec('mkdir C:\\Tuckn\\test'); // Asynchronously create the directory
   * fs.existsSync('C:\\Tuckn\\test'); // Returns: indefinite (true or false)
   *
   * // Deprecations: Using GUI applications
   * exec('notepad.exe');
   * // Asynchronously run Notepad with hidden window... :-(
   *
   * exec('notepad.exe', { winStyle: 'activeDef' });
   * // Asynchronously run Notepad with active window! :-)
   * // But it is easier to understand using `execFile('notepad.exe')`
   * @function exec
   * @memberof Wsh.ChildProcess
   * @param {string} command - The executable file path or the command of CMD.
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {boolean} [options.shell=true] - Wrap with CMD.EXE
   * @param {(number|string)} [options.winStyle='hidden'] - See {@link https://docs.tuckn.net/WshUtil/Wsh.Constants.windowStyles.html|Wsh.Constants.windowStyles}.
   * @returns {(0|void)} - Always 0 or undefined
   */
  child_process.exec = function (command, options) {
    var functionName = 'child_process.exec';
    if (!isSolidString(command)) throwErrNonStr(functionName, command);

    var exeObj = child_process.splitCommand(command);

    return _run(exeObj.mainCmd, exeObj.argsStr,
      objAssign({ shell: true, winStyle: 'hidden' }, options));
  }; // }}}

  // child_process.execFile {{{
  /**
   * Asynchronously executes the executable file. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_execfile_file_args_options_callback|Node.js child_process.execFile()}.
   *
   * @example
   * // Use Case: Applications that do not require processing results
   * var execFile = Wsh.ChildProcess.execFile; // Shorthand
   *
   * // Asynchronously run Notepad with active window
   * execFile('notepad.exe');
   * execFile('notepad.exe', ['D:\\memo.txt'], { winStyle: 'activeMax' });
   *
   * // Arguments will be parsed
   * // 'mY& p@ss>_<' to '"mY^& p@ss^>_^<"'
   * execFile('net.exe',
   *   ['use', '\\\\CompName\\IPC$', 'mY& p@ss>_<', '/user:Tuckn'],
   *   { winStyle: 'hidden' }
   * );
   *
   * // DOS commands
   * execFile('mkdir', ['C:\\Tuckn\\test']); // Error
   * execFile('mkdir', ['C:\\Tuckn\\test'], { shell: true }); // OK!
   * @function execFile
   * @memberof Wsh.ChildProcess
   * @param {string} file - The executable file path or the command of CMD.
   * @param {string[]} [args] - The Array of arguments.
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {(number|string)} [options.winStyle='activeDef'] - See {@link https://docs.tuckn.net/WshUtil/Wsh.Constants.windowStyles.html|Wsh.Constants.windowStyles}.
   * @param {boolean} [options.shell=false] - Wrap with CMD.EXE
   * @returns {(0|void)} - Always 0 or undefined
   */
  child_process.execFile = function (file, args, options) {
    var functionName = 'child_process.execFile';
    if (!isSolidString(file)) throwErrNonStr(functionName, file);
    if (!isSolidArray(args)) args = [];

    return _run(file, args,
      objAssign({ shell: false, winStyle: 'activeDef' }, options));
  }; // }}}

  // _runSync {{{
  /**
   * @typedef {object} typeRunSyncReturn
   * @property {boolean} error
   * @property {string} stdout
   * @property {string} stderr
   */

  /**
   * Executes the command and returns the StdOut.
   *
   * @private
   * @param {string} cmdStr
   * @param {string[]|string} args
   * @param {object} [options] - See {@link https://docs.tuckn.net/WshOS/Wsh.OS.html#.runSync|Wsh.OS.runSync}
   * @returns {typeRunSyncReturn}
   */
  function _runSync (cmdStr, args, options) {
    var functionName = '_runSync';
    if (!isSolidString(cmdStr)) throwErrNonStr(functionName, cmdStr);

    var logStdout = os.makeTmpPath('cp-execSync_stdout_', '.log');
    var logStderr = os.makeTmpPath('cp-execSync_stderr_', '.log');

    var stdioArgs;
    if (isArray(args)) {
      stdioArgs = args.concat([
        '1>', srrPath(logStdout), '2>', srrPath(logStderr)]);
    } else if (isString(args)) {
      stdioArgs = args + ' 1>' + srrPath(logStdout) + ' 2>' + srrPath(logStderr);
    } else {
      throw new Error('Error [ERR_INVALID_ARG_TYPE]\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    var error = true;
    var stdout = '';
    var stderr = '';
    var runsAdmin = obtain(options, 'runsAdmin', null);

    try {
      if (runsAdmin === true && !process.isAdmin()) {
        os.runAsAdmin(cmdStr, stdioArgs, options);
      } else if (runsAdmin === false && process.isAdmin()) {
        os.Task.runTemporary(cmdStr, stdioArgs, options);
      } else {
        os.runSync(cmdStr, stdioArgs, options);
      }
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    // Wait and Read the stdout
    try {
      var encoding = obtain(options, 'encoding', os.cmdCodeset());

      /**
       * @FIXME Infinity roop when os.runAsAdmin() run but rejected admin running
       */
      stdout = fse.ensureReadingFile(logStdout, 0, { encoding: encoding });
      stderr = fse.ensureReadingFile(logStderr, 0, { encoding: encoding });
      error = isSolidString(stderr);
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    // Delete the temporary log files for standard streams.
    // @note 管理者で実行した結果のStdファイルもユーザーから削除可能
    try {
      fse.removeSync(logStdout);
      fse.removeSync(logStderr);
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    return { stdout: stdout, stderr: stderr, error: error };
  } // }}}

  // child_process.execSync {{{
  /**
   * Executes the command within CommandPrompt. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options|Node.js child_process.execSync()}.
   *
   * @example
   * // Use Case: DOS commands or CUI applications that require processing results
   * var execSync = Wsh.ChildProcess.execSync; // Shorthand
   *
   * var retObj = execSync('dir /A:H /B "C:\\Users"');
   * console.dir(retObj);
   * // Outputs:
   * // { error: false,
   * //   stdout: "All Users
   * // Default
   * // Default User
   * // desktop.ini",
   * //   stderr: "" }
   *
   * var retObj = execSync('"C:\\Image Magick\\identify.exe" C:\\test.png');
   * console.dir(retObj);
   * // Outputs:
   * // { error: false,
   * //   stdout: "C:\test.png PNG 1920x1160 1920x1160+0+0 8-bit sRGB 353763B 0.000u 0:00.002",
   * //   stderr: "" }
   *
   * // Deprecations: Using GUI applications
   * execSync('notepad.exe');
   * // Notepad is running with a hidden window... :-(
   * // and this JS process is stopping until you close the window.
   * console.log('Closed the Notepad!');
   * @function execSync
   * @memberof Wsh.ChildProcess
   * @param {string} command - The executable file path or the command of CMD.
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {boolean} [options.shell=false] - Wrap with CMD.EXE
   * @param {(number|string)} [options.winStyle='hidden'] - See {@link https://docs.tuckn.net/WshUtil/Wsh.Constants.windowStyles.html|Wsh.Constants.windowStyles}.
   * @returns {typeRunSyncReturn}
   */
  child_process.execSync = function (command, options) {
    var functionName = 'child_process.execSync';
    if (!isSolidString(command)) throwErrNonStr(functionName, command);

    var exeObj = child_process.splitCommand(command);

    return _runSync(exeObj.mainCmd, exeObj.argsStr,
      objAssign({ shell: true, winStyle: 'hidden' }, options));
  }; // }}}

  // child_process.execFileSync {{{
  /**
   * Executes the executable file. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_execfilesync_file_args_options|Node.js child_process}.
   *
   * @example
   * // Use Case: Applications that require processing results
   * var execFileSync = Wsh.ChildProcess.execFileSync; // Shorthand
   *
   * var retObj = execFileSync('net.exe',
   *   ['use', '\\\\CompName\\IPC$', 'mY& p@ss>_<', '/user:Tuckn'],
   *   { winStyle: 'hidden' }
   * );
   * console.dir(retObj);
   * // Outputs:
   * // { error: false,
   * //   stdout: "....",
   * //   stderr: "" }
   *
   * execFileSync('C:\\Program Files\\IrfanView\\i_view64.exe', ['C:\\result.png']);
   * // Run IrfanView with active window.
   * // and this JS process is stopping until you close the window.
   * console.log('Closed the window of IrfanView');
   * @function execFileSync
   * @memberof Wsh.ChildProcess
   * @param {string} file - The executable file path or the command of CMD.
   * @param {string[]} [args]
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {(number|string)} [options.winStyle='activeDef'] - See {@link https://docs.tuckn.net/WshUtil/Wsh.Constants.windowStyles.html|Wsh.Constants.windowStyles}.
   * @param {boolean} [options.shell=false] - Wrap with CMD.EXE
   * @returns {typeRunSyncReturn}
   */
  child_process.execFileSync = function (file, args, options) {
    var functionName = 'child_process.execFileSync';
    if (!isSolidString(file)) throwErrNonStr(functionName, file);
    if (!isSolidArray(args)) args = [];

    // @todo If `shell` is `false` to get stdout,  (It's Node.js spec)
    return _runSync(file, args,
      objAssign({ shell: true, winStyle: 'activeDef' }, options));
  }; // }}}

  // child_process.spawnSync {{{
  /**
   * Executes the command within CommandPrompt. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options|Node.js child_process}.
   *
   * @function spawnSync
   * @memberof Wsh.ChildProcess
   * @param {string} command - The executable file path or the command of CMD.
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {boolean} [options.shell=false] - Wrap with CMD.EXE
   * @param {(number|string)} [options.winStyle='hidden'] - See {@link https://docs.tuckn.net/WshUtil/Wsh.Constants.windowStyles.html|Wsh.Constants.windowStyles}.
   * @returns {typeExecSyncReturn}
   */
  child_process.spawnSync = function (command, options) {
    var functionName = 'child_process.spawnSync';
    if (!isSolidString(command)) throwErrNonStr(functionName, command);

    var exeObj = child_process.splitCommand(command);

    try {
      return os.execSync(exeObj.mainCmd, exeObj.argsStr,
        objAssign({ shell: false }, options));
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + functionName + ' (' + MODULE_TITLE + ')\n'
        + '  command: "' + command + '"');
    }
  }; // }}}

  // child_process.execFileViaJSON {{{
  /**
   * [Experimental] Runs {@link Wsh.ChildProcess.execFileSync} according to the contents of the JSON file and write the result to that JSON file.
   *
   * @example
   * var execFileViaJSON = Wsh.ChildProcess.execFileViaJSON; // Shorthand
   *
   * // D:\sample.json
   * // { "file": "C:\\Program Files\\Image Magick\\identify.exe",
   * //   "args": ["-verbose", "D:\\test.png"],
   * //   "options": { "winStyle": "hidden" } }
   *
   * execFileViaJSON('D:\\sample.json');
   *
   * var fse = Wsh.FileSystemExtra;
   * var assoc = fse.readJsonSync('D:\\sample.json');
   * console.log(assoc.error);
   * console.log(assoc.stdout);
   * console.log(assoc.stderr);
   * @function execFileViaJSON
   * @memberof Wsh.ChildProcess
   * @param {string} jsonPath - The JSON filepath
   * @param {object} [options] - See {@link https://docs.tuckn.net/WshFileSystem/Wsh.FileSystemExtra.html#.readJsonSync|Wsh.FileSystemExtra.readJsonSync}
   * @returns {void}
   */
  child_process.execFileViaJSON = function (jsonPath, options) {
    var assoc = fse.readJsonSync(jsonPath, options);

    if (!hasContent(assoc)) {
      throw new Error('Error: The content of the JSON file is empy\n'
        + '  at child_process.execFileViaJSON (' + MODULE_TITLE + ')\n'
        + '  jsonPath: ' + insp(jsonPath) + '\n'
        + '  options: ' + insp(options));
    }

    var rtnAssoc = child_process.execFileSync(assoc.file, assoc.args, assoc.options);

    fse.writeJsonSync(jsonPath, Object.assign(assoc, rtnAssoc), options);
  }; // }}}

  // child_process.isRunningAsAdmin {{{
  /**
   * [Experimental] Checks if the process is running as administrator authority.
   *
   * @example
   * var isRunningAsAdmin = Wsh.ChildProcess.isRunningAsAdmin; // Shorthand
   *
   * isRunningAsAdmin(1234); // Returns: false
   * @function isRunningAsAdmin
   * @memberof Wsh.ChildProcess
   * @param {(number|string)} [processName] - The PID or the process name or the full path. If empty to specify all processes.
   * @returns {boolean}
   */
  child_process.isRunningAsAdmin = function (processName) {
    // 今のユーザーがAdminの場合、MediumWILに降格してスクリプトを実行する術は
    // ない？。ので、今起動しているプロセスは、全てHighWILだと断定する
    // また今のWindowsがUACを持たない場合も同様
    if (isSameStr(process.env['USERNAME'], 'administrator') || !os.hasUAC() || os.isUacDisable()) {
      return true;
    }

    var sWbemObjSet = os.WMI.getProcess(processName);

    // 既にこのスクリプトがMediumWILで実行されているのなら、
    // この状態のまま指定されたプロセス情報を取得し判断する
    if (!process.isAdmin()) {
      if (!hasContent(sWbemObjSet)) return undefined;
      return !hasContent(sWbemObjSet.ExecutablePath);
    }

    // Adminじゃないけど、このスクリプトがHighWILで実行されている時
    // 一番面倒くさい。MediumWILに降格したスクリプトを使いそのスクリプトから
    // 指定されたプロセスの情報をJSONで出力し、その内容を分析して判断する

    var tmpJsPath = os.makeTmpPath('isRunningAsAdmin-', '.js');
    var codeGetExePathWithPID = 'var W = WScript;'
+ 'var E = new Enumerator(W.CreateObject("WbemScripting.SWbemLocator").ConnectServer(null, "root\\\\CIMV2").ExecQuery("SELECT * FROM Win32_Process WHERE ProcessID=' + sWbemObjSet.ProcessID + '"));'
+ 'var ws = [];'
+ 'while (!E.atEnd()) { ws.push(E.item()); E.moveNext(); }'
+ 'if (ws.length === 0) W.Quit(1);'
+ 'var ps = new Enumerator(ws[0].Properties_); var p;'
+ 'while (!ps.atEnd()) {'
+ 'p = ps.item(); if (p.Name === "ExecutablePath") {'
+ 'W.Echo(p.Value); W.Quit(0); } ps.moveNext(); }'
+ 'W.Quit();';

    var tmpJs = fso.CreateTextFile(tmpJsPath);
    tmpJs.Write(codeGetExePathWithPID);
    tmpJs.Close(); // @note Save UTF-8 on Win10

    var rtnDic = child_process.execFileSync(os.exefiles.cscript, ['//nologo', tmpJsPath], {
      encoding: os.cmdCodeset(),
      winStyle: 'hidden',
      runsAdmin: false });

    fso.DeleteFile(tmpJsPath, CD.fso.force.yes);

    if (!hasContent(rtnDic.stdout)) {
      return undefined;
    } else if (/^null/.test(rtnDic.stdout)) {
      return true; // High WIL
    } else if (path.isAbsolute(rtnDic.stdout.trim())) {
      return false; // not High
    }
  }; // }}}

  // child_process.writeProcessPropsToJson {{{
  /**
   * [Experimental] Writes information of the process as a JSON file.
   *
   * @example
   * var writePInfo = Wsh.ChildProcess.writeProcessPropsToJson; // Shorthand
   *
   * writePInfo('12345', 'D:\\process-info.json');
   * @function writeProcessPropsToJson
   * @memberof Wsh.ChildProcess
   * @param {(number|string)} [processName] - The PID or the process name or the full path. If empty to specify all processes.
   * @param {string} jsonPath - The JSON filepath to write.
   * @returns {void}
   */
  child_process.writeProcessPropsToJson = function (processName, jsonPath) {
    return fse.writeJsonSync(jsonPath, os.getProcessObj(processName));
  }; // }}}

  // child_process.registTaskForExecutingHighWIL {{{
  /**
   * [W.I.P] @todo Registers the command in Task Scheduler to execute with administrator authority.
   *
   * @function registTaskForExecutingHighWIL
   * @memberof Wsh.ChildProcess
   */
  child_process.registTaskForExecutingHighWIL = function () {
    // @TODO
  }; // }}}

  // child_process.setExePath {{{
  /**
   * [Experimental]
   *
   * @function setExePath
   * @memberof Wsh.ChildProcess
   * @param {string} setVar - The variable to set a path
   * @param {string} req32 - The 32bit executable file path
   * @param {string} [req64] - The 64bit executable file path
   * @param {string} [exePath]
   * @returns {string}
   */
  child_process.setExePath = function (setVar, req32, req64, exePath) {
    if (hasContent(exePath)) {
      setVar = exePath;
    } else if (setVar !== undefined) {
      // @TODO __dirname or process.cwd()?
      setVar = path.join(__dirname, path.parse(setVar).base);

      if (fs.statSync(setVar).isFile()) {
        /* */
      } else if (!hasContent(req64)) {
        setVar = fse.findRequiredFile(req32);
      } else if (os.is64arch()) {
        setVar = fse.findRequiredFile(req64);
      } else {
        setVar = fse.findRequiredFile(req32);
      }
    }

    if (!hasContent(setVar)) {
      throw new Error('Error: Failed to find the path\n'
        + '  at child_process.setExePath (' + MODULE_TITLE + ')\n'
        + '  req64: ' + insp(req64) + '\n  exePath: ' + insp(exePath));
    }

    return setVar;
  }; // }}}
})();

// vim:set foldmethod=marker commentstring=//%s :
