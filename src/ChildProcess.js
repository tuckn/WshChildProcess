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

  var objAdd = Object.assign;
  var insp = util.inspect;
  var obtain = util.obtainPropVal;
  var isArray = util.isArray;
  var isEmpty = util.isEmpty;
  var isString = util.isString;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var hasContent = util.hasContent;
  var isSameStr = util.isSameMeaning;
  var unset = util.unset;
  var srrd = os.surroundCmdArg;

  var child_process = Wsh.ChildProcess;

  /** @constant {string} */
  var MODULE_TITLE = 'WshChildProcess/ChildProcess.js';

  var throwErrNonArray = function (functionName, typeErrVal) {
    util.throwTypeError('array', MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  // child_process.splitCommand {{{
  /**
   * @typedef {object} typesplitCommandReturn
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
   * @returns {typesplitCommandReturn} - { mainCmd, argsStr }
   */
  child_process.splitCommand = function (command) {
    var FN = 'child_process.splitCommand';
    if (!isSolidString(command)) throwErrNonStr(FN, command);

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
          + '  at ' + FN + ' (' + MODULE_TITLE + ')');
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

  // child_process.exec {{{
  /**
   * Asynchronously executes the command within CommandPrompt. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback|Node.js child_process.exec()}. The function to be executed is one of os.shRun, os.runAsAdmin and os.Task.runTemporary.
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
   * // Asynchronously create the symbolic-link in D:\Temp
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
   *
   * // dry-run: No execute, returns the string of command.
   * var log = exec('mkdir C:\\Tuckn\\test', { isDryRun: true });
   * console.log(log);
   * // Outputs:
   * // dry-run [_shRun]: C:\Windows\System32\cmd.exe /S /C"mkdir C:\Tuckn\test"
   * @function exec
   * @memberof Wsh.ChildProcess
   * @param {string} command - The executable file path or the command of CMD.
   * @param {object} [options] - See {@link https://docs.tuckn.net/WshOS/global.html#typeShRunOptions|typeShRunOptions}.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @returns {(0|void|string)} - A return value varies depending on an options parameter. options.runsAdmin: true or false and WSH process is admin => undefined. options.isDryRun: true => string. When others, returns 0.
   */
  child_process.exec = function (command, options) {
    var FN = 'child_process.exec';
    if (!isSolidString(command)) throwErrNonStr(FN, command);

    var exeObj = child_process.splitCommand(command);
    var cmdStr = exeObj.mainCmd;
    var args = exeObj.argsStr;

    var op = objAdd({ shell: true, escapes: true, winStyle: 'hidden' }, options);

    var runsAdmin = obtain(options, 'runsAdmin', null);
    unset(op, 'runsAdmin');

    try {
      if (runsAdmin === true && !process.isAdmin()) {
        return os.runAsAdmin(cmdStr, args, op);
      } else if (runsAdmin === false && process.isAdmin()) {
        return os.Task.runTemporary(cmdStr, args, op);
      } else {
        return os.shRun(cmdStr, args, op);
      }
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }
  }; // }}}

  // child_process.execSync {{{
  /**
   * Executes the command within CommandPrompt and returns a StdOut. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options|Node.js child_process.execSync()}.
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
   *
   * // dry-run: No execute, returns the string of command.
   * var log = execSync('dir /A:H /B "C:\\Users"', { isDryRun: true });
   * console.log(log);
   * // Outputs:
   * // dry-run [_shRun]: C:\Windows\System32\cmd.exe /S /C"dir /A:H /B "C:\Users" 1> C:\%TMP%\stdout.log 2> C:\%TMP%\stderr.log"
   * @function execSync
   * @memberof Wsh.ChildProcess
   * @param {string} command - The executable file path or the command of CMD.
   * @param {object} [options] - See {@link https://docs.tuckn.net/WshOS/global.html#typeShRunOptions|typeShRunOptions}.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @returns {(typeExecSyncReturn|string)} - Basically returns {@link https://docs.tuckn.net/WshOS/global.html#typeExecSyncReturn|typeExecSyncReturn}. But, option.runsAdmin: true or false and WSH process is admin => exitCode is always undefined. options.isDryRun: true => string.
   */
  child_process.execSync = function (command, options) {
    var FN = 'child_process.execSync';
    if (!isSolidString(command)) throwErrNonStr(FN, command);

    var exeObj = child_process.splitCommand(command);
    var cmdStr = exeObj.mainCmd;
    var args = exeObj.argsStr;

    var op = objAdd({ shell: true, escapes: true, winStyle: 'hidden' }, options);

    var runsAdmin = obtain(options, 'runsAdmin', null);
    unset(op, 'runsAdmin');

    var logStdout = os.makeTmpPath('cp-execSync_stdout_', '.log');
    var logStderr = os.makeTmpPath('cp-execSync_stderr_', '.log');

    var stdioArgs;
    if (isArray(args)) {
      stdioArgs = args.concat(['1>', srrd(logStdout), '2>', srrd(logStderr)]);
    } else if (isString(args)) {
      stdioArgs = args + ' 1>' + srrd(logStdout) + ' 2>' + srrd(logStderr);
    } else {
      throw new Error('Error [ERR_INVALID_ARG_TYPE]\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    var exitCode;
    var error = true;
    var stdout = '';
    var stderr = '';

    try {
      var retVal;

      if (runsAdmin === true && !process.isAdmin()) {
        retVal = os.runAsAdmin(cmdStr, stdioArgs, op);
      } else if (runsAdmin === false && process.isAdmin()) {
        retVal = os.Task.runTemporary(cmdStr, stdioArgs, op);
      } else {
        retVal = os.shRunSync(cmdStr, stdioArgs, op);
      }

      var isDryRun = obtain(options, 'isDryRun', false);
      if (isDryRun) {
        return 'dry-run [' + FN + ']: ' + retVal;
      } else {
        exitCode = retVal;
      }
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
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
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    // Delete the temporary log files for standard streams.
    // @note 管理者で実行した結果のStdファイルもユーザーから削除可能
    try {
      fse.removeSync(logStdout);
      fse.removeSync(logStderr);
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  cmdStr: "' + cmdStr + '"\n  args: ' + insp(args));
    }

    return {
      exitCode: exitCode,
      error: error,
      stdout: stdout,
      stderr: stderr
    };
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
   * var rtn = execFile('notepad.exe', ['D:\\memo.txt']);
   * // Get the process info
   * var sWbemObjSet = wmi.getProcess(rtn.ProcessID);
   * ...
   * rtn.Terminate(); // Exit the GUI process
   *
   * // Arguments will be parsed
   * // 'mY& p@ss>_<' to '"mY^& p@ss^>_^<"'
   * execFile('net.exe',
   *   ['use', '\\\\CompName\\IPC$', 'mY& p@ss>_<', '/user:Tuckn']
   * );
   *
   * // To execute the DOS command, you need option shell: true.
   * execFile('mkdir', ['C:\\Tuckn\\test']); // Error
   * execFile('mkdir', ['C:\\Tuckn\\test'], { shell: true }); // OK!
   *
   * // dry-run: No execute, returns the string of command.
   * var log = execFile('notepad.exe', ['D:\\memo.txt'], { isDryRun: true });
   * console.log(log);
   * // Outputs:
   * // dry-run [_shRun]: notepad.exe D:\memo.txt
   * @function execFile
   * @memberof Wsh.ChildProcess
   * @param {string} file - The executable file path or the command of CMD.
   * @param {(string[]|string)} [args] - The arguments.
   * @param {typeOsExecOptions} [options] - See {@link https://docs.tuckn.net/WshOS/global.html#typeOsExecOptions|typeOsExecOptions}.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {boolean} [options.shell=false] - Wrap with CMD.EXE
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {(typeExecObject|number|void|string)} - A return value varies depending on an options parameter. options.runsAdmin: true => void. options.runsAdmin: false and WSH process is admin => number. options.isDryRun: true => string. When others, returns {@link https://docs.tuckn.net/WshOS/global.html#typeExecObject|typeExecObject}.
   */
  child_process.execFile = function (file, args, options) {
    var FN = 'child_process.execFile';
    if (!isSolidString(file)) throwErrNonStr(FN, file);

    var op = objAdd({ shell: false, escapes: false }, options);

    var runsAdmin = obtain(options, 'runsAdmin', null);
    unset(op, 'runsAdmin');

    try {
      if (runsAdmin === true && !process.isAdmin()) {
        return os.runAsAdmin(file, args, op);
      } else if (runsAdmin === false && process.isAdmin()) {
        return os.Task.runTemporary(file, args, op);
      } else {
        return os.shExec(file, args, op);
      }
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  file: "' + file + '"\n  args: ' + insp(args));
    }
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
   *   ['use', '\\\\CompName\\IPC$', 'mY& p@ss>_<', '/user:Tuckn']
   * );
   * console.dir(retObj);
   * // Outputs:
   * // { exitCode: 0,
   * //   error: false,
   * //   stdout: "....",
   * //   stderr: "" }
   *
   * execFileSync('C:\\Program Files\\IrfanView\\i_view64.exe', 'C:\\result.png');
   * // Runs IrfanView with active window.
   * // and this JS process is stopping until you close the window.
   * console.log('Closed the window of IrfanView');
   *
   * // dry-run: No execute, returns the string of command.
   * var log = execFileSync('net.exe',
   *   ['use', '\\\\CompName\\IPC$', 'mY& p@ss>_<', '/user:Tuckn'],
   *   { shell: true, isDryRun: true }
   * );
   * console.log(log);
   * // Outputs:
   * // dry-run [os.exeSync]: C:\Windows\System32\cmd.exe /S /C"net.exe use \\CompName\IPC$ "mY^& p@ss^>_^<" /user:Tuckn 1> C:\%TMP%\stdout.log 2> C:\%TMP%\stderr.log"
   * @function execFileSync
   * @memberof Wsh.ChildProcess
   * @param {string} file - The executable file path or the command of CMD.
   * @param {(string[]|string)} [args] - The arguments.
   * @param {typeOsExecOptions} [options] - See {@link https://docs.tuckn.net/WshOS/global.html#typeOsExecOptions|typeOsExecOptions}.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @returns {(typeExecSyncReturn|void|string)} - A return value varies depending on an options parameter. options.runsAdmin: true or false and WSH process is admin => returns undefined. options.isDryRun: true => string. When others, returns {@link https://docs.tuckn.net/WshOS/global.html#typeExecSyncReturn|typeExecSyncReturn}.
   */
  child_process.execFileSync = function (file, args, options) {
    var FN = 'child_process.execFileSync';
    if (!isSolidString(file)) throwErrNonStr(FN, file);

    var op = objAdd({ shell: false, escapes: false }, options);

    var runsAdmin = obtain(options, 'runsAdmin', null);
    unset(op, 'runsAdmin');

    try {
      if (runsAdmin === true && !process.isAdmin()) {
        return os.runAsAdmin(file, args, op);
      } else if (runsAdmin === false && process.isAdmin()) {
        return os.Task.runTemporary(file, args, op);
      } else {
        return os.shExecSync(file, args, op);
      }
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  file: "' + file + '"\n  args: ' + insp(args));
    }
  }; // }}}

  // child_process.spawnSync {{{
  /**
   * [W.I.P] Executes the command within CommandPrompt. Similar to {@link https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options|Node.js child_process}.
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
    var FN = 'child_process.spawnSync';
    if (!isSolidString(command)) throwErrNonStr(FN, command);

    var exeObj = child_process.splitCommand(command);

    try {
      return os.shExecSync(
        exeObj.mainCmd,
        exeObj.argsStr,
        objAdd({ shell: false }, options)
      );
    } catch (e) {
      throw new Error(insp(e) + '\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
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
   * console.dir(assoc);
   * // { "file": "C:\\Program Files\\Image Magick\\identify.exe",
   * //   "args": ["-verbose", "D:\\test.png"],
   * //   "options": { "winStyle": "hidden" },
   * //   "error": false,
   * //   "stdout": "....",
   * //   "stderr": "" }
   * @function execFileViaJSON
   * @memberof Wsh.ChildProcess
   * @param {string} jsonPath - The JSON filepath
   * @param {object} [options] - See {@link https://docs.tuckn.net/WshFileSystem/Wsh.FileSystemExtra.html#.readJsonSync|Wsh.FileSystemExtra.readJsonSync}
   * @returns {void}
   */
  child_process.execFileViaJSON = function (jsonPath, options) {
    var FN = 'child_process.execFileViaJSON';
    var assoc = fse.readJsonSync(jsonPath, options);

    if (!hasContent(assoc)) {
      throw new Error('Error: The content of the JSON file is empy\n'
        + '  at child_process.execFileViaJSON (' + MODULE_TITLE + ')\n'
        + '  jsonPath: ' + insp(jsonPath) + '\n'
        + '  options: ' + insp(options));
    }

    var retVal = child_process.execFileSync(
      assoc.file,
      assoc.args,
      assoc.options
    );

    var isDryRun = obtain(options, 'isDryRun', false);
    if (isDryRun) return 'dry-run [' + FN + ']: ' + retVal;

    fse.writeJsonSync(jsonPath, Object.assign(assoc, retVal), options);
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

  // child_process.registerTaskForExecutingHighWIL {{{
  /**
   * [W.I.P] @todo Registers the command in Task Scheduler to execute with administrator authority.
   *
   * @function registerTaskForExecutingHighWIL
   * @memberof Wsh.ChildProcess
   */
  child_process.registerTaskForExecutingHighWIL = function () {
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
