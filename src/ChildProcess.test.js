/* globals Wsh: false */
/* globals __dirname: false */
/* globals __filename: false */
/* globals process: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var CD = Wsh.Constants;
var util = Wsh.Util;
var path = Wsh.Path;
var os = Wsh.OS;
var wmi = Wsh.OS.WMI;
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var child_process = Wsh.ChildProcess;

var isSolidString = util.isSolidString;
var includes = util.includes;
var startsWith = util.startsWith;
var srrd = os.surroundCmdArg;
var CMD = os.exefiles.cmd;
var CSCRIPT = os.exefiles.cscript;

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('ChildProcess', function () {
  var testName;
  var assetsDir = path.join(__dirname, 'assets');
  var dirSandbox = path.join(assetsDir, 'Sandbox');
  var mockWsfCLI = path.join(dirSandbox, 'MockCLI.wsf');
  var MockCLIArgsCheck = path.join(dirSandbox, 'MockCLIArgsCheck.wsf');
  var mockWsfGUI = path.join(dirSandbox, 'MockGUI.wsf');
  var fileStdout = path.join(dirSandbox, 'stdout.txt');
  var testCmd = srrd(CSCRIPT) + ' ' + srrd(__filename) + ' //job:test:ChildProcess';
  var noneStrVals = [true, false, undefined, null, 0, 1, NaN, Infinity, [], {}];

  test('splitCommand', function () {
    var splitCommand = child_process.splitCommand;
    var cmdStr, rtnObj;

    noneStrVals.forEach(function (val) {
      expect(_cb(splitCommand, val)).toThrowError();
    });

    cmdStr = '"C:\\My Apps\\test.exe"';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('C:\\My Apps\\test.exe');
    expect(rtnObj.argsStr).toBe('');

    cmdStr = '"C:\\My Apps\\test.exe" -s "fileName"';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('C:\\My Apps\\test.exe');
    expect(rtnObj.argsStr).toBe('-s "fileName"');

    cmdStr = '"C:\\apps\\test.exe" -s fileName';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('C:\\apps\\test.exe');
    expect(rtnObj.argsStr).toBe('-s fileName');

    cmdStr = 'C:\\apps\\test.exe -s fileName';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('C:\\apps\\test.exe');
    expect(rtnObj.argsStr).toBe('-s fileName');

    cmdStr = 'C:\\apps\\test.exe';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('C:\\apps\\test.exe');
    expect(rtnObj.argsStr).toBe('');

    cmdStr = 'dir';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('dir');
    expect(rtnObj.argsStr).toBe('');

    cmdStr = 'mklink /D "filePath2" filePath1';
    rtnObj = splitCommand(cmdStr);
    expect(rtnObj.mainCmd).toBe('mklink');
    expect(rtnObj.argsStr).toBe('/D "filePath2" filePath1');
  });

  // exec

  test('exec_dosCommand', function () {
    var exec = child_process.exec;
    var tmpPath = os.makeTmpPath();
    var cmd;
    var rtnVal;

    noneStrVals.forEach(function (val) {
      expect(_cb(exec, val)).toThrowError();
    });

    cmd = 'mkdir ' + srrd(tmpPath);

    // dry-run
    rtnVal = exec(cmd, { isDryRun: true });
    expect(rtnVal).toContain('[_shRun]: ' + CMD + ' /S /C"' + cmd);

    // Can use a CMD command without option "shell: true" in exec
    rtnVal = exec(cmd);
    expect(fs.existsSync(tmpPath)).toBe(false);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    while (!fs.existsSync(tmpPath)) WScript.Sleep(300); // Waiting the finished

    expect(fs.existsSync(tmpPath)).toBe(true);

    // Cleans
    fse.removeSync(tmpPath);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  test('exec_dosCommand_runsAdminTrue', function () {
    var exec = child_process.exec;
    var cmd;
    var rtnVal;

    // Creates the test directory
    var tmpDir = os.makeTmpPath('exec-runsAdmin_');
    expect(fs.existsSync(tmpDir)).toBe(false);
    fse.ensureDirSync(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(true);

    // Creates the test file
    var testFile = path.join(tmpDir, 'testfile.txt');
    expect(fs.existsSync(testFile)).toBe(false);
    fs.writeFileSync(testFile, 'Test File');
    expect(fs.existsSync(testFile)).toBe(true);

    // Creates the symlink path
    var testFileSymlink = path.join(tmpDir, 'testfile-Symlink.txt');

    cmd = 'mklink ' + srrd(testFileSymlink) + ' ' + srrd(testFile);

    rtnVal = exec(cmd);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    var msecTimeOut = 6000;
    do {
      WScript.Sleep(300);
      msecTimeOut -= 300;
    } while (!fs.existsSync(testFileSymlink) && msecTimeOut > 0);

    expect(fs.existsSync(testFileSymlink)).toBe(false); // Failed

    // Uses runsAdmin option
    // dry-run
    rtnVal = exec(cmd, { runsAdmin: true, isDryRun: true });
    expect(rtnVal).toContain('[os.runAsAdmin]: ' + CMD + ' /S /C"' + cmd);

    rtnVal = exec(cmd, { runsAdmin: true });
    expect(rtnVal).toBe(undefined); // Always undefined (using runsAdmin)

    msecTimeOut = 6000;
    do {
      WScript.Sleep(300);
      msecTimeOut -= 300;
    } while (!fs.existsSync(testFileSymlink) && msecTimeOut > 0);

    expect(fs.existsSync(testFileSymlink)).toBe(true);

    // Cleans
    fse.removeSync(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  // execSync

  test('execSync_dosCommand', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execSync, val)).toThrowError();
    });

    var execSync = child_process.execSync;
    var cmd;
    var rtn;

    // Creates mock files
    var testDir = os.makeTmpPath('execSync_');
    fse.ensureDirSync(testDir);
    expect(fs.existsSync(testDir)).toBe(true);

    var file1 = path.join(testDir, 'file1.txt');
    var file2 = path.join(testDir, 'file2.log');
    var file3 = path.join(testDir, 'file3');
    fs.writeFileSync(file1, 'Test File1');
    fs.writeFileSync(file2, 'Test File2');
    fs.writeFileSync(file3, 'Test File3');

    cmd = 'dir /B "' + testDir + '"';

    // dry-run
    rtn = execSync(cmd, { isDryRun: true });
    expect(rtn).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"' + cmd + ' 1>');
    // Executing
    rtn = execSync(cmd);
    expect(rtn.exitCode).toBe(CD.runs.ok);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('file1.txt\r\nfile2.log\r\nfile3\r\n');
    expect(rtn.stderr).toBe('');

    cmd = 'dir Non-Existing-Path';
    rtn = execSync(cmd);
    expect(rtn.exitCode).toBe(CD.runs.err);
    expect(rtn.error).toBe(true);
    expect(rtn.stdout).not.toBe('');
    expect(rtn.stderr).not.toBe(''); // ファイルが見つかりません

    // Cleans
    fse.removeSync(testDir);
    expect(fs.existsSync(testDir)).toBe(false);
  });

  test('execSync_exeFile', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execSync, val)).toThrowError();
    });

    var execSync = child_process.execSync;
    var cmd;
    var rtn;

    cmd = srrd(CSCRIPT) + ' //nologo //job:nonErr "' + mockWsfCLI + '"';

    // dry-run
    rtn = execSync(cmd, { isDryRun: true });
    expect(rtn).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"' + cmd + ' 1>');
    // Executing
    rtn = execSync(cmd);

    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtn.stderr).toBe('');

    cmd = srrd(CSCRIPT) + ' //nologo //job:withErr "' + mockWsfCLI + '"';
    rtn = execSync(cmd);

    expect(rtn.exitCode).toBe(1);
    expect(rtn.error).toBe(true);
    expect(rtn.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtn.stderr.indexOf('StdErr Message') !== -1).toBe(true);
  });

  test('execSync_runsAdminTrue', function () {
    var execSync = child_process.execSync;
    var rtn;

    // Creates the test directory
    var testDir = os.makeTmpPath('execSync-runsAdmin_');
    expect(fs.existsSync(testDir)).toBe(false);
    fse.ensureDirSync(testDir);
    expect(fs.existsSync(testDir)).toBe(true);

    // Creates the test file
    var testFile = path.join(testDir, 'testfile.txt');
    expect(fs.existsSync(testFile)).toBe(false);
    fs.writeFileSync(testFile, 'Test File');
    expect(fs.existsSync(testFile)).toBe(true);

    var testFileSymlink = path.join(testDir, 'testfile-Symlink.txt');
    var cmd = 'mklink ' + srrd(testFileSymlink) + ' ' + srrd(testFile);

    // None runsAdmin option
    rtn = execSync(cmd);
    expect(fs.existsSync(testFileSymlink)).toBe(false); // Failed
    expect(rtn.exitCode).toBe(CD.runs.err);
    expect(rtn.error).toBe(true);
    expect(rtn.stdout).toBe('');
    expect(isSolidString(rtn.stderr)).toBe(true);
    // expect(rtnVal.stderr).toBe('この操作を実行するための十分な特権がありません。');

    // dry-run
    rtn = execSync(cmd, { runsAdmin: true, isDryRun: true });
    expect(rtn).toContain('[os.runAsAdmin]: ' + CMD + ' /S /C"' + cmd);
    expect(fs.existsSync(testFileSymlink)).toBe(false);

    // Use runsAdmin option
    rtn = execSync(cmd, { runsAdmin: true });
    expect(fs.existsSync(testFileSymlink)).toBe(true);
    expect(rtn.exitCode).toBe(undefined);
    expect(rtn.error).toBe(false);
    expect(isSolidString(rtn.stdout)).toBe(true);
    expect(rtn.stderr).toBe('');

    // Cleans
    fse.removeSync(testDir);
    expect(fs.existsSync(testDir)).toBe(false);
  });

  testName = 'execSync_exeFile_runsAdminFalse';
  test(testName, function () {
    var execSync = child_process.execSync;
    var cmd;
    var resultFile = path.join(os.tmpdir(), testName + '.log');
    var stdoutFile = path.join(os.tmpdir(), testName + '_stdout.log');
    var stderrFile = path.join(os.tmpdir(), testName + '_stderr.log');
    var SUBPROCESS1_ADMIN = '/SUBPROCESS1_ADMIN';
    var SUBPROCESS2_USER = '/SUBPROCESS2_USER';

    if (includes(process.argv, SUBPROCESS1_ADMIN)) {
      if (process.isAdmin()) {
        cmd = testCmd + ' -t ' + testName + ' ' + SUBPROCESS2_USER;

        // dry-run
        var rtnVal = execSync(cmd, { runsAdmin: false, isDryRun: true });
        fs.writeFileSync(resultFile, rtnVal, { encoding: 'utf8' });

        var stdObj = execSync(cmd, { runsAdmin: false });
        // Saves the Stdout messages
        fs.writeFileSync(stdoutFile, stdObj.stdout, { encoding: 'utf8' });
        fs.writeFileSync(stderrFile, stdObj.stderr, { encoding: 'utf8' });

        process.exit(CD.runs.ok);
      }

      process.exit(CD.runs.err);
    }

    // Outputs Stdout messages
    if (includes(process.argv, SUBPROCESS2_USER)) {
      console.info('StdOut Message');
      console.error('StdErr Message');
      process.exit(CD.runs.ok);
    }

    // Confirms none Stdout files
    fse.removeSync(resultFile);
    fse.removeSync(stdoutFile);
    fse.removeSync(stderrFile);
    expect(fs.existsSync(resultFile)).toBe(false);
    expect(fs.existsSync(stdoutFile)).toBe(false);
    expect(fs.existsSync(stderrFile)).toBe(false);

    // Runs the admin process and Do the test function in it
    cmd = testCmd + ' -t ' + testName + ' ' + SUBPROCESS1_ADMIN;
    execSync(cmd, { runsAdmin: true });

    // Waits the Stdout files created
    while (!fs.existsSync(stdoutFile)) WScript.Sleep(300);
    expect(fs.existsSync(stdoutFile)).toBe(true);

    while (!fs.existsSync(stderrFile)) WScript.Sleep(300);
    expect(fs.existsSync(stderrFile)).toBe(true);

    var logStr = fs.readFileSync(resultFile, { encoding: 'utf8' });
    expect(logStr).toContain('[os.Task.runTemporary]: ');

    var resStdout = fs.readFileSync(stdoutFile, { encoding: 'utf8' });
    expect(resStdout.indexOf('StdOut Message') !== -1).toBe(true);

    var resStderr = fs.readFileSync(stderrFile, { encoding: 'utf8' });
    expect(resStderr.indexOf('StdErr Message') !== -1).toBe(true);

    // Cleans
    fse.removeSync(stdoutFile);
    fse.removeSync(stderrFile);
    expect(fs.existsSync(stdoutFile)).toBe(false);
    expect(fs.existsSync(stderrFile)).toBe(false);
  });

  // execFile

  test('exec_exeFile', function () {
    var exec = child_process.exec;
    var cmd;
    var rtnVal;

    cmd = srrd(CSCRIPT) + ' //nologo //job:nonErr ' + srrd(mockWsfCLI);

    // dry-run
    rtnVal = exec(cmd, { isDryRun: true });
    expect(rtnVal).toContain('[_shRun]: ' + CMD + ' /S /C"' + cmd);
    // Executing
    rtnVal = exec(cmd);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    cmd = srrd(CSCRIPT) + ' //nologo //job:withErr ' + srrd(mockWsfCLI);

    rtnVal = exec(cmd);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)
  });

  testName = 'exec_exeFile_runsAdminFalse';
  test(testName, function () {
    var exec = child_process.exec;
    var cmd;
    var resultFile = path.join(os.tmpdir(), testName + '.log');
    var SUBPROCESS1_ADMIN = '/SUBPROCESS1_ADMIN';
    var SUBPROCESS2_USER = '/SUBPROCESS2_USER';

    if (includes(process.argv, SUBPROCESS1_ADMIN)) {
      if (process.isAdmin()) {
        cmd = testCmd + ' -t ' + testName + '$ ' + SUBPROCESS2_USER;

        // dry-run
        var rtnVal = exec(cmd, { runsAdmin: false, isDryRun: true });
        fs.writeFileSync(resultFile, rtnVal, { encoding: 'utf8' });

        exec(cmd, { runsAdmin: false });
        process.exit(CD.runs.ok);
      }

      process.exit(CD.runs.err);
    }

    if (includes(process.argv, SUBPROCESS2_USER)) {
      if (process.isAdmin()) {
        fs.writeFileSync(resultFile, 'Failed', { encoding: 'utf8' });

        process.exit(CD.runs.err);
      }

      var cmdLog = fs.readFileSync(resultFile, { encoding: 'utf8' });
      fs.writeFileSync(resultFile, 'Success\n' + cmdLog, { encoding: 'utf8' });

      process.exit(CD.runs.ok);
    }

    fse.removeSync(resultFile);
    expect(fs.existsSync(resultFile)).toBe(false);

    cmd = testCmd + ' -t ' + testName + '$ ' + SUBPROCESS1_ADMIN;

    exec(cmd, { runsAdmin: true });

    while (!fs.existsSync(resultFile)) WScript.Sleep(300);
    expect(fs.existsSync(resultFile)).toBe(true);
    WScript.Sleep(3000);

    var logStr = fs.readFileSync(resultFile, { encoding: 'utf8' });
    expect(startsWith(logStr, 'Success')).toBeTruthy();
    expect(logStr).toContain('[os.Task.runTemporary]: ');

    // Cleans
    fse.removeSync(resultFile);
    expect(fs.existsSync(resultFile)).toBe(false);
  });

  test('execFile_dosCommand', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execFile, val)).toThrowError();
    });

    var execFile = child_process.execFile;
    var tmpDir = os.makeTmpPath('execFile_CMDcmd_');
    var rtn;

    // Non shell option
    // dry-run
    rtn = execFile('mkdir', [tmpDir], { isDryRun: true });
    expect(rtn).toContain('[os.shExec]: mkdir ' + tmpDir);
    // Executing -> Fail, because mkdir is CMD command
    expect(_cb(execFile, 'mkdir', [tmpDir])).toThrowError();

    // With shell options
    // dry-run
    rtn = execFile('mkdir', [tmpDir], { shell: true, isDryRun: true });
    expect(rtn).toContain('[os.shExec]: ' + CMD + ' /S /C"mkdir ' + tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);
    // Executing
    rtn = execFile('mkdir', [tmpDir], { shell: true });
    expect(rtn.ExitCode).toBe(CD.runs.ok); // Always 0 (Async)

    while (rtn.Status == 0) WScript.Sleep(300); // Waiting the finished
    expect(fs.existsSync(tmpDir)).toBe(true);

    // Cleans
    fse.removeSync(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  test('execFile_exeFile_CLI', function () {
    var execFile = child_process.execFile;
    var args;
    var rtn, stdOut, stdErr;

    // Stdout
    args = ['//nologo', '//job:nonErr', mockWsfCLI];

    // dry-run
    rtn = execFile(CSCRIPT, args, { isDryRun: true });
    expect(rtn).toContain('[os.shExec]: ' + CSCRIPT + ' ' + os.joinCmdArgs(args));
    // Executing
    rtn = execFile(CSCRIPT, args);
    expect(rtn.ExitCode).toBe(CD.runs.ok); // Always 0 (Async)
    // Waiting the finished
    while (rtn.Status == 0) WScript.Sleep(300);

    stdOut = rtn.StdOut.ReadAll();
    expect(rtn.StdOut.ReadAll() === '').toBe(true); // empty after ReadAll

    stdErr = rtn.StdErr.ReadAll();
    expect(rtn.StdErr.ReadAll() === '').toBe(true); // empty after ReadAll

    expect(stdOut.indexOf('StdOut Message') !== -1).toBe(true);
    expect(stdErr === '').toBe(true); // Empty

    // Stderr
    args = ['//nologo', '//job:withErr', mockWsfCLI];
    // Executing
    rtn = execFile(CSCRIPT, args);
    // Waiting the finished
    while (rtn.Status == 0) WScript.Sleep(300);

    stdOut = rtn.StdOut.ReadAll();
    expect(rtn.StdOut.ReadAll() === '').toBe(true); // empty after ReadAll

    stdErr = rtn.StdErr.ReadAll();
    expect(rtn.StdErr.ReadAll() === '').toBe(true); // empty after ReadAll

    expect(stdOut === 'StdOut Message').toBe(true);
    expect(stdErr.indexOf('StdErr Message') !== -1).toBe(true);
  });

  test('execFile_exeFile_GUI', function () {
    var execFile = child_process.execFile;
    var args;
    var rtn;

    args = ['//nologo', '//job:run', mockWsfGUI];

    rtn = execFile(CSCRIPT, args);
    expect(rtn.ExitCode).toBe(CD.runs.ok); // Always 0 (Async)

    // Get the GUI process info
    var sWbemObjSet = wmi.getProcess(rtn.ProcessID);
    var obj = wmi.toJsObject(sWbemObjSet);

    // Exit the GUI process
    rtn.Terminate();

    sWbemObjSet = wmi.getProcess(rtn.ProcessID);
    // sWbemObjSet is null = the GUI process not found
    expect(_cb(wmi.toJsObject, sWbemObjSet)).toThrowError();
  });

  test('execFile_exeFile_runsAdminTrue', function () {
    var execFile = child_process.execFile;
    var symlinkPath = os.makeTmpPath('execFile_exeFile_runsAdmin_');
    var args, argsStr;
    var cmd = '"mklink ' + srrd(symlinkPath) + ' ' + srrd(__filename) + '"';
    var rtn, stdOut, stdErr;

    args = ['/S', '/C', cmd];

    rtn = execFile(CMD, args, { escapes: false });
    expect(rtn.ExitCode).toBe(CD.runs.ok); // Always 0 (Async)
    // Waiting the finished
    while (rtn.Status == 0) WScript.Sleep(300);

    stdOut = rtn.StdOut.ReadAll();
    expect(rtn.StdOut.ReadAll() === '').toBe(true); // empty after ReadAll

    stdErr = rtn.StdErr.ReadAll();
    expect(rtn.StdErr.ReadAll() === '').toBe(true); // empty after ReadAll

    expect(stdOut).toBe(''); // Empty
    expect(stdErr).not.toBe(''); // この操作を実行するための十分な特権がありません。

    expect(fs.existsSync(symlinkPath)).toBe(false);

    // dry-run
    rtn = execFile(CMD, args, {
      escapes: false,
      runsAdmin: true,
      isDryRun: true
    });

    argsStr = os.joinCmdArgs(args, { escapes: false });
    expect(rtn).toContain('[os.runAsAdmin]: ' + CMD + ' ' + argsStr);
    expect(fs.existsSync(symlinkPath)).toBe(false);
    // Executing
    rtn = execFile(CMD, args, { escapes: false, runsAdmin: true });
    // If use `runsAdmin: true` option, always returns `undefined`.
    expect(rtn).toBeUndefined();

    while (!fs.existsSync(symlinkPath)) WScript.Sleep(300);
    expect(fs.existsSync(symlinkPath)).toBe(true);

    // Cleans
    fse.removeSync(symlinkPath);
    expect(fs.existsSync(symlinkPath)).toBe(false);
  });

  // execFileSync

  test('execFileSync_exeFile_CLI', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execFileSync, val)).toThrowError();
    });

    var execFileSync = child_process.execFileSync;
    var args;
    var rtn;

    args = ['//nologo', '//job:nonErr', mockWsfCLI];

    // dry-run
    rtn = execFileSync(CSCRIPT, args, { isDryRun: true });
    expect(rtn).toContain('dry-run [os.shExecSync]: ' + CSCRIPT + ' ' + os.joinCmdArgs(args));
    // Executing
    rtn = execFileSync(CSCRIPT, args);
    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('StdOut Message');
    expect(rtn.stderr).toBe('');

    // Check getting StdErr
    args = ['//nologo', '//job:withErr', mockWsfCLI];

    rtn = execFileSync(CSCRIPT, args);
    expect(rtn.exitCode).toBe(1);
    expect(rtn.error).toBe(true);
    expect(rtn.stdout).toBe('StdOut Message');
    expect(rtn.stderr).toBe('StdErr Message');

    // Using shell: true option -> Same result
    rtn = execFileSync(CSCRIPT, args, { shell: true, escapes: true });
    expect(rtn.exitCode).toBe(1);
    expect(rtn.error).toBe(true);
    expect(rtn.stdout).toBe('StdOut Message');
    expect(rtn.stderr).toBe('StdErr Message');
  });

  test('execFileSync_exeFile_CLIArgsCheck', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execFileSync, val)).toThrowError();
    });

    var execFileSync = child_process.execFileSync;
    var args, argsStr;
    var rtn;

    args = [
      '//nologo',
      '//job:run',
      MockCLIArgsCheck,
      '1',
      '2 Foo bar',
      '-p"My p@ss wo^d"',
      '>',
      fileStdout
    ];
    argsStr = os.joinCmdArgs(args, { escapes: false });

    // dry-run
    rtn = execFileSync(CSCRIPT, args, { isDryRun: true });
    expect(rtn).toContain('dry-run [os.shExecSync]: ' + CSCRIPT + ' ' + argsStr);

    // Remove the stdout file
    fse.removeSync(fileStdout);
    expect(fs.existsSync(fileStdout)).toBe(false);

    // Executing
    rtn = execFileSync(CSCRIPT, args);
    expect(rtn.exitCode).toBe(1);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toContain('args[0]:1');
    expect(rtn.stdout).toContain('args[1]:2 Foo bar');
    expect(rtn.stdout).toContain('args[2]:-pMy p@ss wo^d'); // WSH remove "
    expect(rtn.stdout).toContain('args[3]:>');
    expect(rtn.stdout).toContain('args[4]:' + fileStdout); // Removed "
    expect(rtn.stderr).toBe('');
    // Stdout file is not created
    expect(fs.existsSync(fileStdout)).toBe(false);

    // Using option shell: true
    rtn = execFileSync(CSCRIPT, args, { shell: true, escapes: true });
    expect(rtn.exitCode).toBe(1);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('');
    expect(rtn.stderr).toBe('');
    // Stdout file is created
    expect(fs.existsSync(fileStdout)).toBe(true);

    // Clean
    fse.removeSync(fileStdout);
    expect(fs.existsSync(fileStdout)).toBe(false);
  });

  test('execFileSync_exeFile_GUI', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execFileSync, val)).toThrowError();
    });

    var execFileSync = child_process.execFileSync;
    var args;
    var rtn;

    args = ['//nologo', '//job:run', mockWsfGUI];

    // dry-run
    rtn = execFileSync(CSCRIPT, args, { isDryRun: true });
    expect(rtn).toContain('dry-run [os.shExecSync]: ' + CSCRIPT + ' ' + os.joinCmdArgs(args));

    rtn = execFileSync(CSCRIPT, args);
    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('');
    expect(rtn.stderr).toBe('');

    args = ['//nologo', '//job:autoQuit0', mockWsfGUI];

    rtn = execFileSync(CSCRIPT, args);
    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('');
    expect(rtn.stderr).toBe('');

    args = ['//nologo', '//job:autoQuit1', mockWsfGUI];

    rtn = execFileSync(CSCRIPT, args);
    expect(rtn.exitCode).toBe(1);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('');
    expect(rtn.stderr).toBe('');
  });

  test('spawnSync', function () {
    var spawnSync = child_process.spawnSync;
    expect('@TODO').toBe('TEST');

    noneStrVals.forEach(function (val) {
      expect(_cb(spawnSync, val)).toThrowError();
    });
  });

  test('execFileViaJSON', function () {
    expect('@TODO').toBe('TEST');
  });

  test('isRunningAsAdmin', function () {
    expect('@TODO').toBe('TEST');
  });

  test('writeProcessPropsToJson', function () {
    expect('@TODO').toBe('TEST');
  });

  test('registerTaskForExecutingHighWIL', function () {
    expect('@TODO').toBe('TEST');
  });

  test('setExePath', function () {
    expect('@TODO').toBe('TEST');
  });
});
