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
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var child_process = Wsh.ChildProcess;

var isSolidString = util.isSolidString;
var includes = util.includes;
var srr = os.surroundPath;
var CMD = os.exefiles.cmd;
var CSCRIPT = os.exefiles.cscript;
var NET = os.exefiles.net;

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('ChildProcess', function () {
  var testName;
  var assetsDir = path.join(__dirname, 'assets');
  var mockWsfCLI = path.join(assetsDir, 'MockCLI.wsf');
  var mockWsfGUI = path.join(assetsDir, 'MockGUI.wsf');
  var testCmd = srr(CSCRIPT) + ' ' + srr(__filename) + ' //job:test:ChildProcess';
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

  test('exec_CmdCommand', function () {
    var exec = child_process.exec;

    var tmpPath = os.makeTmpPath();
    var rtnVal;

    noneStrVals.forEach(function (val) {
      expect(_cb(exec, val)).toThrowError();
    });

    // Can use a CMD command without option "shell: true" in exec
    rtnVal = exec('mkdir ' + srr(tmpPath));
    expect(fs.existsSync(tmpPath)).toBe(false);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    while (!fs.existsSync(tmpPath)) WScript.Sleep(300); // Waiting the finished

    expect(fs.existsSync(tmpPath)).toBe(true);

    // Cleans
    fse.removeSync(tmpPath);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  test('exec_CmdCommand_runsAdmin-true', function () {
    var exec = child_process.exec;

    var rtnVal;
    var cmd;

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

    cmd = 'mklink ' + srr(testFileSymlink) + ' ' + srr(testFile);
    rtnVal = exec(cmd);

    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    var msecTimeOut = 6000;
    do {
      WScript.Sleep(300);
      msecTimeOut -= 300;
    } while (!fs.existsSync(testFileSymlink) && msecTimeOut > 0);

    expect(fs.existsSync(testFileSymlink)).toBe(false); // Failed

    // Uses runsAdmin option
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

  test('exec_ExecFile', function () {
    var exec = child_process.exec;
    var rtnVal;

    rtnVal = exec(srr(CSCRIPT) + ' //nologo //job:nonErr ' + srr(mockWsfCLI));
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    rtnVal = exec(srr(CSCRIPT) + ' //nologo //job:withErr ' + srr(mockWsfCLI));
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)
  });

  testName = 'exec_ExecFile_runsAdmin-false';
  test(testName, function () {
    var exec = child_process.exec;

    var cmd;
    var TEST1_ADMIN = '/TEST1_ADMIN';
    var TEST2_USER = '/TEST2_USER';

    if (includes(process.argv, TEST1_ADMIN)) {
      if (process.isAdmin()) {
        cmd = testCmd + ' -t ' + testName + '$ ' + TEST2_USER;
        exec(cmd, { runsAdmin: false });

        process.exit(CD.runs.ok);
      }

      process.exit(CD.runs.err);
    }

    var resultFile = path.join(os.tmpdir(), testName + '.log');

    if (includes(process.argv, TEST2_USER)) {
      if (!process.isAdmin()) {
        fs.writeFileSync(resultFile, 'Failed', { encoding: 'utf8' });

        process.exit(CD.runs.err);
      }

      fs.writeFileSync(resultFile, 'Success', { encoding: 'utf8' });
      process.exit(CD.runs.ok);
    }

    fse.removeSync(resultFile);
    expect(fs.existsSync(resultFile)).toBe(false);

    cmd = testCmd + ' -t ' + testName + '$ ' + TEST1_ADMIN;
    exec(cmd, { runsAdmin: true });

    while (!fs.existsSync(resultFile)) WScript.Sleep(300);
    expect(fs.existsSync(resultFile)).toBe(true);

    var resMessage = fs.readFileSync(resultFile, { encoding: 'utf8' });

    expect(resMessage).toBe('Success');

    // Cleans
    fse.removeSync(resultFile);
    expect(fs.existsSync(resultFile)).toBe(false);
  });

  test('execFile_CmdCommand', function () {
    var execFile = child_process.execFile;

    var tmpDir = os.makeTmpPath('execFile_CMDcmd_');
    var rtnVal;

    // Non shell option -> Fail, because mkdir is CMD command
    expect(_cb(execFile, 'mkdir', [tmpDir])).toThrowError();

    expect(fs.existsSync(tmpDir)).toBe(false);
    rtnVal = execFile('mkdir', [tmpDir], { shell: true });

    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)
    while (!fs.existsSync(tmpDir)) WScript.Sleep(300); // Waiting the finished
    expect(fs.existsSync(tmpDir)).toBe(true);

    // Cleans
    fse.removeSync(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);

    noneStrVals.forEach(function (val) {
      expect(_cb(execFile, val)).toThrowError();
    });
  });

  test('execFile_ExecFile_activeDef', function () {
    var execFile = child_process.execFile;
    var rtnVal;

    // Default -> winStyle: "activeDef"
    rtnVal = execFile(CSCRIPT, ['//nologo', '//job:nonErr', mockWsfCLI]);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    rtnVal = execFile(CSCRIPT, ['//nologo', '//job:withErr', mockWsfCLI]);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    expect('@TODO').toBe('Checked a window activated');
  });

  test('execFile_ExecFile_hidden', function () {
    var execFile = child_process.execFile;
    var rtnVal;

    // winStyle: "hidden"
    rtnVal = execFile(CSCRIPT,
      ['//nologo', '//job:nonErr', mockWsfCLI],
      { winStyle: 'hidden' });
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    rtnVal = execFile(CSCRIPT,
      ['//nologo', '//job:withErr', mockWsfCLI],
      { winStyle: 'hidden' });
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    expect('@TODO').toBe('Checked a window hidden');
  });

  test('execFile_ExeFile_runsAdmin-true', function () {
    var execFile = child_process.execFile;

    var symlinkPath = os.makeTmpPath('execFile_ExeFile_runsAdmin_');
    var cmd = '"mklink ' + srr(symlinkPath) + ' ' + srr(__filename) + '"';
    var rtnVal;

    rtnVal = execFile(CMD, ['/S', '/C', cmd], { escapes: false });
    // `mklink` returns 0 even if the link creation fails.
    expect(rtnVal).toBe(0);

    expect(fs.existsSync(symlinkPath)).toBe(false);

    rtnVal = execFile(CMD, ['/S', '/C', cmd],
      {  escapes: false, runsAdmin: true });
    // If use `runsAdmin: true` option, always returns `undefined`.
    expect(rtnVal).toBeUndefined();

    while (!fs.existsSync(symlinkPath)) WScript.Sleep(300);
    expect(fs.existsSync(symlinkPath)).toBe(true);

    // Cleans
    fse.removeSync(symlinkPath);
    expect(fs.existsSync(symlinkPath)).toBe(false);
  });

  test('execSync_CmdCommand', function () {
    var execSync = child_process.execSync;
    var rtnObj;

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

    rtnObj = execSync('dir /B "' + testDir + '"');
    expect(rtnObj.error).toBe(false);
    expect(rtnObj.stdout).toBe('file1.txt\r\nfile2.log\r\nfile3\r\n');
    expect(rtnObj.stderr).toBe('');

    // Cleans
    fse.removeSync(testDir);
    expect(fs.existsSync(testDir)).toBe(false);

    noneStrVals.forEach(function (val) {
      expect(_cb(execSync, val)).toThrowError();
    });
  });

  test('execSync_ExecFile', function () {
    var execSync = child_process.execSync;
    var rtnObj;

    rtnObj = execSync(srr(CSCRIPT) + ' //nologo //job:withErr "' + mockWsfCLI + '"');
    expect(rtnObj.error).toBe(true);
    expect(rtnObj.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnObj.stderr.indexOf('StdErr Message') !== -1).toBe(true);

    rtnObj = execSync(srr(CSCRIPT) + ' //nologo //job:nonErr "' + mockWsfCLI + '"');
    expect(rtnObj.error).toBe(false);
    expect(rtnObj.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnObj.stderr).toBe('');

    noneStrVals.forEach(function (val) {
      expect(_cb(execSync, val)).toThrowError();
    });
  });

  test('execSync_runsAdmin-true', function () {
    var execSync = child_process.execSync;
    var rtnObj;

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
    var cmd = 'mklink ' + srr(testFileSymlink) + ' ' + srr(testFile);

    // None runsAdmin option
    rtnObj = execSync(cmd);

    expect(fs.existsSync(testFileSymlink)).toBe(false); // Failed
    expect(rtnObj.error).toBe(true);
    expect(rtnObj.stdout).toBe('');
    expect(isSolidString(rtnObj.stderr)).toBe(true);
    // expect(rtnObj.stderr).toBe('この操作を実行するための十分な特権がありません。');

    // Uses runsAdmin option
    rtnObj = execSync(cmd, { runsAdmin: true });

    expect(fs.existsSync(testFileSymlink)).toBe(true);
    expect(rtnObj.error).toBe(false);
    expect(isSolidString(rtnObj.stdout)).toBe(true);
    expect(rtnObj.stderr).toBe('');

    // Cleans
    fse.removeSync(testDir);
    expect(fs.existsSync(testDir)).toBe(false);
  });

  testName = 'execSync_ExecFile_runsAdmin-false';
  test(testName, function () {
    var execSync = child_process.execSync;

    var cmd;

    var TEST1_ADMIN = '/TEST1_ADMIN';
    var TEST2_USER = '/TEST2_USER';

    var stdoutFile = path.join(os.tmpdir(), testName + '_stdout.log');
    var stderrFile = path.join(os.tmpdir(), testName + '_stderr.log');

    if (includes(process.argv, TEST1_ADMIN)) {
      if (process.isAdmin()) {
        cmd = testCmd + ' -t ' + testName + ' ' + TEST2_USER;
        // Runs with Medium WIL and get the Stdout
        var stdObj = execSync(cmd, { runsAdmin: false });
        // Saves the Stdout messages
        fs.writeFileSync(stdoutFile, stdObj.stdout, { encoding: 'utf8' });
        fs.writeFileSync(stderrFile, stdObj.stderr, { encoding: 'utf8' });

        process.exit(CD.runs.ok);
      }

      process.exit(CD.runs.err);
    }

    // Outputs Stdout messages
    if (includes(process.argv, TEST2_USER)) {
      console.info('StdOut Message');
      console.error('StdErr Message');
      process.exit(CD.runs.ok);
    }

    // Confirms none Stdout files
    fse.removeSync(stdoutFile);
    fse.removeSync(stderrFile);
    expect(fs.existsSync(stdoutFile)).toBe(false);
    expect(fs.existsSync(stderrFile)).toBe(false);

    // Runs the admin process and Do the test function in it
    cmd = testCmd + ' -t ' + testName + ' ' + TEST1_ADMIN;
    execSync(cmd, { runsAdmin: true });

    // Waits the Stdout files created
    while (!fs.existsSync(stdoutFile)) WScript.Sleep(300);
    expect(fs.existsSync(stdoutFile)).toBe(true);

    while (!fs.existsSync(stderrFile)) WScript.Sleep(300);
    expect(fs.existsSync(stderrFile)).toBe(true);

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

  test('execFileSync', function () {
    var execFileSync = child_process.execFileSync;

    var rtnObj;

    rtnObj = execFileSync(CSCRIPT, ['//nologo', '//job:withErr', mockWsfCLI]);
    expect(rtnObj.error).toBe(true);
    expect(rtnObj.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnObj.stderr.indexOf('StdErr Message') !== -1).toBe(true);

    rtnObj = execFileSync(CSCRIPT, ['//nologo', '//job:nonErr', mockWsfCLI]);
    expect(rtnObj.error).toBe(false);
    expect(rtnObj.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnObj.stderr).toBe('');

    noneStrVals.forEach(function (val) {
      expect(_cb(execFileSync, val)).toThrowError();
    });
  });

  test('spawnSync', function () {
    var spawnSync = child_process.spawnSync;
    expect('TEST').toBe('PASSED');

    noneStrVals.forEach(function (val) {
      expect(_cb(spawnSync, val)).toThrowError();
    });
  });

  test('execFileViaJSON', function () {
    expect('TEST').toBe('PASSED');
  });

  test('isRunningAsAdmin', function () {
    expect('TEST').toBe('PASSED');
  });

  test('writeProcessPropsToJson', function () {
    expect('TEST').toBe('PASSED');
  });

  test('registerTaskForExecutingHighWIL', function () {
    expect('TEST').toBe('PASSED');
  });

  test('setExePath', function () {
    expect('TEST').toBe('PASSED');
  });
});
