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
var startsWith = util.startsWith;
var srr = os.surroundPath;
var CMD = os.exefiles.cmd;
var CSCRIPT = os.exefiles.cscript;

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

  test('exec_dosCommand', function () {
    var exec = child_process.exec;
    var tmpPath = os.makeTmpPath();
    var cmd;
    var rtnVal;

    noneStrVals.forEach(function (val) {
      expect(_cb(exec, val)).toThrowError();
    });

    cmd = 'mkdir ' + srr(tmpPath);

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

  test('exec_exeFile', function () {
    var exec = child_process.exec;
    var cmd;
    var rtnVal;

    cmd = srr(CSCRIPT) + ' //nologo //job:nonErr ' + srr(mockWsfCLI);

    // dry-run
    rtnVal = exec(cmd, { isDryRun: true });
    expect(rtnVal).toContain('[_shRun]: ' + CMD + ' /S /C"' + cmd);

    rtnVal = exec(cmd);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    cmd = srr(CSCRIPT) + ' //nologo //job:withErr ' + srr(mockWsfCLI);

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
    var rtnVal;

    // Non shell option -> Fail, because mkdir is CMD command
    // dry-run
    rtnVal = execFile('mkdir', [tmpDir], { isDryRun: true });
    expect(rtnVal).toContain('[_shRun]: mkdir ' + tmpDir);

    expect(_cb(execFile, 'mkdir', [tmpDir])).toThrowError();

    // With shell options
    rtnVal = execFile('mkdir', [tmpDir], { shell: true, isDryRun: true });
    expect(rtnVal).toContain('[_shRun]: ' + CMD + ' /S /C"mkdir ' + tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);

    rtnVal = execFile('mkdir', [tmpDir], { shell: true });
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    while (!fs.existsSync(tmpDir)) WScript.Sleep(300); // Waiting the finished
    expect(fs.existsSync(tmpDir)).toBe(true);

    // Cleans
    fse.removeSync(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  test('execFile_exeFile_activeDef', function () {
    var execFile = child_process.execFile;
    var args;
    var rtnVal;

    args = ['//nologo', '//job:nonErr', mockWsfCLI];

    // dry-run
    rtnVal = execFile(CSCRIPT, args, { isDryRun: true });
    expect(rtnVal).toContain('[_shRun]: ' + CSCRIPT + ' ' + args.join(' '));

    // Default -> winStyle: "activeDef"
    rtnVal = execFile(CSCRIPT, args);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    args = ['//nologo', '//job:withErr', mockWsfCLI];

    rtnVal = execFile(CSCRIPT, args);
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    expect('@TODO').toBe('Checked a window activated');
  });

  test('execFile_exeFile_hidden', function () {
    var execFile = child_process.execFile;
    var args;
    var rtnVal;

    // winStyle: "hidden"
    args = ['//nologo', '//job:nonErr', mockWsfCLI];

    rtnVal = execFile(CSCRIPT, args, { winStyle: 'hidden' });
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    args = ['//nologo', '//job:withErr', mockWsfCLI];

    rtnVal = execFile(CSCRIPT, { winStyle: 'hidden' });
    expect(rtnVal).toBe(CD.runs.ok); // Always 0 (No runsAdmin option)

    expect('@TODO').toBe('Checked a window hidden');
  });

  test('execFile_exeFile_runsAdminTrue', function () {
    var execFile = child_process.execFile;
    var symlinkPath = os.makeTmpPath('execFile_exeFile_runsAdmin_');
    var args;
    var cmd = '"mklink ' + srr(symlinkPath) + ' ' + srr(__filename) + '"';
    var rtnVal;

    args = ['/S', '/C', cmd];

    rtnVal = execFile(CMD, args, { escapes: false });
    // `mklink` returns 0 even if the link creation fails.
    expect(rtnVal).toBe(0);
    expect(fs.existsSync(symlinkPath)).toBe(false);

    // dry-run
    rtnVal = execFile(CMD, args, {
      escapes: false, runsAdmin: true, isDryRun: true
    });
    expect(rtnVal).toContain('[os.runAsAdmin]: ' + CMD + ' ' + args.join(' '));
    expect(fs.existsSync(symlinkPath)).toBe(false);

    rtnVal = execFile(CMD, args, { escapes: false, runsAdmin: true });
    // If use `runsAdmin: true` option, always returns `undefined`.
    expect(rtnVal).toBeUndefined();

    while (!fs.existsSync(symlinkPath)) WScript.Sleep(300);
    expect(fs.existsSync(symlinkPath)).toBe(true);

    // Cleans
    fse.removeSync(symlinkPath);
    expect(fs.existsSync(symlinkPath)).toBe(false);
  });

  test('execSync_dosCommand', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execSync, val)).toThrowError();
    });

    var execSync = child_process.execSync;
    var cmd;
    var rtnVal;

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
    rtnVal = execSync(cmd, { isDryRun: true });
    expect(rtnVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"' + cmd + ' 1>');

    rtnVal = execSync(cmd);
    expect(rtnVal.error).toBe(false);
    expect(rtnVal.stdout).toBe('file1.txt\r\nfile2.log\r\nfile3\r\n');
    expect(rtnVal.stderr).toBe('');

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
    var rtnVal;

    cmd = srr(CSCRIPT) + ' //nologo //job:withErr "' + mockWsfCLI + '"';

    // dry-run
    rtnVal = execSync(cmd, { isDryRun: true });
    expect(rtnVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"' + cmd + ' 1>');

    rtnVal = execSync(cmd);
    expect(rtnVal.error).toBe(true);
    expect(rtnVal.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnVal.stderr.indexOf('StdErr Message') !== -1).toBe(true);

    cmd = srr(CSCRIPT) + ' //nologo //job:nonErr "' + mockWsfCLI + '"';

    rtnVal = execSync(cmd);
    expect(rtnVal.error).toBe(false);
    expect(rtnVal.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnVal.stderr).toBe('');
  });

  test('execSync_runsAdminTrue', function () {
    var execSync = child_process.execSync;
    var rtnVal;

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
    rtnVal = execSync(cmd);
    expect(fs.existsSync(testFileSymlink)).toBe(false); // Failed
    expect(rtnVal.error).toBe(true);
    expect(rtnVal.stdout).toBe('');
    expect(isSolidString(rtnVal.stderr)).toBe(true);
    // expect(rtnVal.stderr).toBe('この操作を実行するための十分な特権がありません。');

    // dry-run
    rtnVal = execSync(cmd, { runsAdmin: true, isDryRun: true });
    expect(rtnVal).toContain('[os.runAsAdmin]: ' + CMD + ' /S /C"' + cmd);
    expect(fs.existsSync(testFileSymlink)).toBe(false);

    // Use runsAdmin option
    rtnVal = execSync(cmd, { runsAdmin: true });
    expect(fs.existsSync(testFileSymlink)).toBe(true);
    expect(rtnVal.error).toBe(false);
    expect(isSolidString(rtnVal.stdout)).toBe(true);
    expect(rtnVal.stderr).toBe('');

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

  test('execFileSync_exeFile', function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(execFileSync, val)).toThrowError();
    });

    var execFileSync = child_process.execFileSync;
    var args;
    var rtnVal;

    args = ['//nologo', '//job:withErr', mockWsfCLI];

    // dry-run
    rtnVal = execFileSync(CSCRIPT, args, { isDryRun: true });
    expect(rtnVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + CSCRIPT + ' ' + args.join(' ') + ' 1>');

    rtnVal = execFileSync(CSCRIPT, args);
    expect(rtnVal.error).toBe(true);
    expect(rtnVal.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnVal.stderr.indexOf('StdErr Message') !== -1).toBe(true);

    args = ['//nologo', '//job:nonErr', mockWsfCLI];

    rtnVal = execFileSync(CSCRIPT, args);
    expect(rtnVal.error).toBe(false);
    expect(rtnVal.stdout.indexOf('StdOut Message') !== -1).toBe(true);
    expect(rtnVal.stderr).toBe('');
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
