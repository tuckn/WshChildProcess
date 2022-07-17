# WshChildProcess

This module provides the ability to spawn child processes (similar to Node.js Child-Process).

## tuckn/Wsh series dependency

[WshModeJs](https://github.com/tuckn/WshModeJs)  
└─ [WshNet](https://github.com/tuckn/WshNet)  
&emsp;└─ WshChildProcess - This repository  
&emsp;&emsp;└─ [WshProcess](https://github.com/tuckn/WshProcess)  
&emsp;&emsp;&emsp;&emsp;└─ [WshFileSystem](https://github.com/tuckn/WshFileSystem)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshOS](https://github.com/tuckn/WshOS)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshPath](https://github.com/tuckn/WshPath)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshUtil](https://github.com/tuckn/WshUtil)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshPolyfill](https://github.com/tuckn/WshPolyfill)  

The upper layer module can use all the functions of the lower layer module.

## Operating environment

Works on JScript in Windows.

## Installation

(1) Create a directory of your WSH project.

```console
D:\> mkdir MyWshProject
D:\> cd MyWshProject
```

(2) Download this ZIP and unzip or Use the following `git` command.

```console
> git clone https://github.com/tuckn/WshChildProcess.git ./WshModules/WshChildProcess
or
> git submodule add https://github.com/tuckn/WshChildProcess.git ./WshModules/WshChildProcess
```

(3) Create your JScript (.js) file. For Example,

```console
D:\MyWshProject\
├─ MyScript.js <- Your JScript code will be written in this.
└─ WshModules\
    └─ WshChildProcess\
        └─ dist\
          └─ bundle.js
```

I recommend JScript (.js) file encoding to be UTF-8 [BOM, CRLF].

(4) Create your WSF packaging scripts file (.wsf).

```console
D:\MyWshProject\
├─ Run.wsf <- WSH entry file
├─ MyScript.js
└─ WshModules\
    └─ WshChildProcess\
        └─ dist\
          └─ bundle.js
```

And you should include _.../dist/bundle.js_ into the WSF file.
For Example, The content of the above _Run.wsf_ is

```xml
<package>
  <job id = "run">
    <script language="JScript" src="./WshModules/WshChildProcess/dist/bundle.js"></script>
    <script language="JScript" src="./MyScript.js"></script>
  </job>
</package>
```

I recommend this WSH file (.wsf) encoding to be UTF-8 [BOM, CRLF].

Awesome! This WSH configuration allows you to use the following functions in JScript (_.\\MyScript.js_).

## Usage

Now your JScript (_.\\MyScript.js_ ) can use helper functions to handle processes.
For example,

### splitCommand

```js
var splitCommand = Wsh.ChildProcess.splitCommand; // Shorthand

splitCommand('"C:\\My Apps\\test.exe"');
// Returns:
// { mainCmd: 'C:\\My Apps\\test.exe'
//   argsStr: '' }

splitCommand('"C:\\My Apps\\test.exe" -s "fileName"');
// Returns:
// { mainCmd: 'C:\\My Apps\\test.exe'
//   argsStr: '-s "fileName"' }

splitCommand('mklink /D "filePath2" filePath1');
// Returns:
// { mainCmd: 'mklink'
//   argsStr: '/D "filePath2" filePath1' }
```

### exec

Use Case: Run a DOS command or CUI application asynchronously. And when you don't require the processing results.

```js
var exec = Wsh.ChildProcess.exec; // Shorthand

// Asynchronously create the directory
exec('mkdir C:\\Tuckn\\test');
exec('mkdir C:\\My Apps\\test'); // NG
exec('mkdir "C:\\My Apps\\test"'); // OK

// Asynchronously create the symbolic-link in D:\Temp
exec('mklink D:\\Temp\\hoge-Symlink "C:\\My Foo\\hoge"', {
  runsAdmin: true
});
```

### execSync

Use Case: Run a DOS command or CUI application synchronously. And when you want to receive the processing results.

```js
var execSync = Wsh.ChildProcess.execSync; // Shorthand

var retObj = execSync('dir /A:H /B "C:\\Users"');
console.dir(retObj);
// Outputs:
// { exitCode: 0,
//   error: false,
//   stdout: "All Users
// Default
// Default User
// desktop.ini",
//   stderr: "" }

var retObj = execSync('"C:\\Image Magick\\identify.exe" C:\\test.png');
console.dir(retObj);
// Outputs:
// { exitCode: 0,
//   error: false,
//   stdout: "C:\test.png PNG 1920x1160 1920x1160+0+0 8-bit sRGB 353763B 0.000u 0:00.002",
//   stderr: "" }
```

Tip: execSync can get StdOut of the administrator privileges process by using options, `runsAdmin: true` and `shell: true`.

### execFile

Use Case: Run a GUI application asynchronously, or you want to control the application later with [WshOS.typeExecObject](https://docs.tuckn.net/WshOS/global.html#typeExecObject) or ProcessID.

```js
var execFile = Wsh.ChildProcess.execFile; // Shorthand

// Asynchronously run. The arguments are escaped automatically.
execFile('net.exe',
  ['use', '\\\\CompName\\My Dir', 'mY&p@ss>_<', '/user:Tuckn']
);
// Converted this args to 'use "\\\\CompName\\My Dir" mY^&p@ss^>_^< /user:Tuckn'

// Asynchronously run Notepad with active window
var rtn = execFile('notepad.exe', ['D:\\memo.txt']);
// Get the process info
var sWbemObjSet = wmi.getProcess(rtn.ProcessID);
...
rtn.Terminate(); // Exit the GUI process

// To execute the DOS command, you need option shell: true.
execFile('mkdir', ['C:\\Tuckn\\test']); // Error
execFile('mkdir', ['C:\\Tuckn\\test'], { shell: true }); // OK!
```

### execFileSync

Use Case: Run a CUI application synchronously and when you want to receive the exit code and the processing stdout.

```js
var execFileSync = Wsh.ChildProcess.execFileSync; // Shorthand

var retObj = execFileSync('net.exe',
  ['use', '\\\\CompName\\IPC$', 'mY&p@ss>_<', '/user:Tuckn']
);
console.dir(retObj);
// Outputs:
// { extiCode: 0,
//   error: false,
//   stdout: "....",
//   stderr: "" }

// Run IrfanView with active window.
var retObj = execFileSync('7z.exe', ['u', '-tzip', 'my.zip', 'D:\\My data']);
// and this WSH process is stopping until you close the window.
if (retObj.exitCode === 0) { ... }
```

### Option dry-run

No executes, returns the string of command.

```js
var execFileSync = Wsh.ChildProcess.execFileSync; // Shorthand

var log = execFileSync('net.exe',
 ['use', '\\\\CompName\\IPC$', 'mY&p@ss>_<', '/user:Tuckn'],
 { isDryRun: true, shell: true }
);
console.log(log);
// Outputs:
// dry-run [os.exeSync]: C:\Windows\System32\cmd.exe /S /C"net.exe use \\CompName\IPC$ mY^&p@ss^>_^< /user:Tuckn 1> C:\%TMP%\stdout.log 2> C:\%TMP%\stderr.log"
```


Many other functions will be added.
See the [documentation](https://docs.tuckn.net/WshChildProcess) for more details.

### Dependency Modules

You can also use the following helper functions in your JScript (_.\\MyScript.js_).

- [tuckn/WshPolyfill](https://github.com/tuckn/WshPolyfill)
- [tuckn/WshUtil](https://github.com/tuckn/WshUtil)
- [tuckn/WshPath](https://github.com/tuckn/WshPath)
- [tuckn/WshOS](https://github.com/tuckn/WshOS)
- [tuckn/WshFileSystem](https://github.com/tuckn/WshFileSystem)
- [tuckn/WshProcess](https://github.com/tuckn/WshProcess)

## Documentation

See all specifications [here](https://docs.tuckn.net/WshChildProcess) and also below.

- [WshPolyfill](https://docs.tuckn.net/WshPolyfill)
- [WshUtil](https://docs.tuckn.net/WshUtil)
- [WshPath](https://docs.tuckn.net/WshPath)
- [WshOS](https://docs.tuckn.net/WshOS)
- [WshFileSystem](https://docs.tuckn.net/WshFileSystem)
- [WshProcess](https://docs.tuckn.net/WshProcess)

## License

MIT

Copyright (c) 2020 [Tuckn](https://github.com/tuckn)
