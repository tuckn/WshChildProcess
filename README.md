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

(2) Download this ZIP and unzipping or Use following `git` command.

```console
> git clone https://github.com/tuckn/WshChildProcess.git ./WshModules/WshChildProcess
or
> git submodule add https://github.com/tuckn/WshChildProcess.git ./WshModules/WshChildProcess
```

(3) Include _.\\WshChildProcess\\dist\\bundle.js_ into your .wsf file.
For Example, if your file structure is

```console
D:\MyWshProject\
├─ Run.wsf
├─ MyScript.js
└─ WshModules\
    └─ WshChildProcess\
        └─ dist\
          └─ bundle.js
```

The content of above _Run.wsf_ is

```xml
<package>
  <job id = "run">
    <script language="JScript" src="./WshModules/WshChildProcess/dist/bundle.js"></script>
    <script language="JScript" src="./MyScript.js"></script>
  </job>
</package>
```

I recommend this .wsf file encoding to be UTF-8 [BOM, CRLF].
This allows the following functions to be used in _.\\MyScript.js_.

## Usage

Now _.\\MyScript.js_ (JScript) can use the useful functions to handle file system.
for example,

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

Use Case: DOS commands or CUI applications that do not require processing results.

```js
var exec = Wsh.ChildProcess.exec; // Shorthand

// Asynchronously create the directory
exec('mkdir C:\\Tuckn\\test');
exec('mkdir C:\\My Apps\\test'); // NG
exec('mkdir "C:\\My Apps\\test"'); // OK

// Asynchronously create the symbolic-link in D:\Temp
exec('mklink D:\\Temp\\hoge-Symlink "C:\\My Foo\\hoge"', { runsAdmin: true });
```

### execFile

Use Case: Applications that do not require processing results.

```js
var execFile = Wsh.ChildProcess.execFile; // Shorthand

// Asynchronously run Notepad with active window
execFile('notepad.exe');
execFile('notepad.exe', ['D:\\memo.txt'], { winStyle: 'activeMax' });

// Auto parse arg
execFile('net.exe',
  ['use', '\\\\CompName\\My Dir', 'mY&p@ss>_<', '/user:Tuckn'],
  { winStyle: 'hidden' }
);
// parsed the args to 'use "\\\\CompName\\My Dir" mY^&p@ss^>_^< /user:Tuckn'

// DOS commands
execFile('mkdir', ['C:\\Tuckn\\test']); // Error
execFile('mkdir', ['C:\\Tuckn\\test'], { shell: true }); // OK!
```

### execSync

Use Case: DOS commands or CUI applications that require processing results.

```js
var execSync = Wsh.ChildProcess.execSync; // Shorthand

var retObj = execSync('dir /A:H /B "C:\\Users"');
console.dir(retObj);
// Outputs:
// { error: false,
//   stdout: "All Users
// Default
// Default User
// desktop.ini",
//   stderr: "" }

var retObj = execSync('"C:\\Image Magick\\identify.exe" C:\\test.png');
console.dir(retObj);
// Outputs:
// { error: false,
//   stdout: "C:\test.png PNG 1920x1160 1920x1160+0+0 8-bit sRGB 353763B 0.000u 0:00.002",
//   stderr: "" }
```

### execFileSync

Use Case: Applications that require processing results.

```js
var execFileSync = Wsh.ChildProcess.execFileSync; // Shorthand

var retObj = execFileSync('net.exe',
  ['use', '\\\\CompName\\IPC$', 'mY&p@ss>_<', '/user:Tuckn'],
  { winStyle: 'hidden' }
);
console.dir(retObj);
// Outputs:
// { error: false,
//   stdout: "....",
//   stderr: "" }

execFileSync('C:\\Program Files\\IrfanView\\i_view64.exe', ['C:\\result.png']);
// Run IrfanView with active window.
// and this JS process is stopping until you close the window.
console.log('Closed the window of IrfanView');
```

### Option dry-run

No execute, returns the string of command.

```js
var execFileSync = Wsh.ChildProcess.execFileSync; // Shorthand

var log = execFileSync('net.exe',
 ['use', '\\\\CompName\\IPC$', 'mY&p@ss>_<', '/user:Tuckn'],
 { isDryRun: true }
);
console.log(log);
// Outputs:
// dry-run [_shRun]: C:\Windows\System32\cmd.exe /S /C"net.exe use \\CompName\IPC$ mY^&p@ss^>_^< /user:Tuckn 1> C:\%TMP%\stdout.log 2> C:\%TMP%\stderr.log"
```


Many other functions are added.
See the [documentation](https://docs.tuckn.net/WshChildProcess) for more details.

### Dependency Modules

You can also use the following useful functions in _.\\MyScript.js_ (JScript).

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
