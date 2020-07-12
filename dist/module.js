﻿!function(){var CD,util,fso,path,os,fs,fse,objAssign,insp,obtain,isArray,isString,isSolidArray,isSolidString,hasContent,isSameStr,srrPath,child_process,MODULE_TITLE,throwErrNonStr;function _run(cmdStr,args,options){isSolidString(cmdStr)||throwErrNonStr("_run",cmdStr);var runsAdmin=obtain(options,"runsAdmin",null);try{return!0!==runsAdmin||process.isAdmin()?!1===runsAdmin&&process.isAdmin()?os.Task.runTemporary(cmdStr,args,options):os.run(cmdStr,args,options):os.runAsAdmin(cmdStr,args,options)}catch(e){throw new Error(insp(e)+"\n  at _run ("+MODULE_TITLE+')\n  cmdStr: "'+cmdStr+'"\n  args: '+insp(args))}}function _runSync(cmdStr,args,options){isSolidString(cmdStr)||throwErrNonStr("_runSync",cmdStr);var stdioArgs,logStdout=os.makeTmpPath("cp-execSync_stdout_",".log"),logStderr=os.makeTmpPath("cp-execSync_stderr_",".log");if(isArray(args))stdioArgs=args.concat(["1>",srrPath(logStdout),"2>",srrPath(logStderr)]);else{if(!isString(args))throw new Error("Error [ERR_INVALID_ARG_TYPE]\n  at _runSync ("+MODULE_TITLE+')\n  cmdStr: "'+cmdStr+'"\n  args: '+insp(args));stdioArgs=args+" 1>"+srrPath(logStdout)+" 2>"+srrPath(logStderr)}var error=!0,stdout="",stderr="",runsAdmin=obtain(options,"runsAdmin",null);try{!0!==runsAdmin||process.isAdmin()?!1===runsAdmin&&process.isAdmin()?os.Task.runTemporary(cmdStr,stdioArgs,options):os.runSync(cmdStr,stdioArgs,options):os.runAsAdmin(cmdStr,stdioArgs,options)}catch(e){throw new Error(insp(e)+"\n  at _runSync ("+MODULE_TITLE+')\n  cmdStr: "'+cmdStr+'"\n  args: '+insp(args))}try{var encoding=obtain(options,"encoding",os.cmdCodeset()),stdout=fse.ensureReadingFile(logStdout,0,{encoding:encoding}),stderr=fse.ensureReadingFile(logStderr,0,{encoding:encoding}),error=isSolidString(stderr)}catch(e){throw new Error(insp(e)+"\n  at _runSync ("+MODULE_TITLE+')\n  cmdStr: "'+cmdStr+'"\n  args: '+insp(args))}try{fse.removeSync(logStdout),fse.removeSync(logStderr)}catch(e){throw new Error(insp(e)+"\n  at _runSync ("+MODULE_TITLE+')\n  cmdStr: "'+cmdStr+'"\n  args: '+insp(args))}return{stdout:stdout,stderr:stderr,error:error}}Wsh&&Wsh.ChildProcess||(Wsh.ChildProcess={},CD=Wsh.Constants,util=Wsh.Util,fso=Wsh.FileSystemObject,path=Wsh.Path,os=Wsh.OS,fs=Wsh.FileSystem,fse=Wsh.FileSystemExtra,objAssign=Object.assign,insp=util.inspect,obtain=util.obtainPropVal,isArray=util.isArray,isString=util.isString,isSolidArray=util.isSolidArray,isSolidString=util.isSolidString,hasContent=util.hasContent,isSameStr=util.isSameMeaning,srrPath=os.surroundPath,child_process=Wsh.ChildProcess,MODULE_TITLE="WshChildProcess/ChildProcess.js",throwErrNonStr=function(functionName,typeErrVal){util.throwTypeError("string",MODULE_TITLE,functionName,typeErrVal)},child_process.splitCommand=function(command){var mainCmd;isSolidString(command)||throwErrNonStr("child_process.splitCommand",command);var argsStr="";if(0===(command=command.trim()).indexOf('"')){var posCloseDq=command.indexOf('"',1);if(-1===posCloseDq)throw new Error("Error [Failed to parse] command: "+command+"\n  at child_process.splitCommand ("+MODULE_TITLE+")");return mainCmd=command.slice(1,posCloseDq),command.length>posCloseDq&&(argsStr=command.slice(posCloseDq+2)),{mainCmd:mainCmd,argsStr:argsStr}}var pos1stSpace=command.indexOf(" ");return-1===pos1stSpace?{mainCmd:command,argsStr:argsStr}:(mainCmd=command.slice(0,pos1stSpace),command.length>pos1stSpace&&(argsStr=command.slice(pos1stSpace+1)),{mainCmd:mainCmd,argsStr:argsStr})},child_process.exec=function(command,options){isSolidString(command)||throwErrNonStr("child_process.exec",command);var exeObj=child_process.splitCommand(command);return _run(exeObj.mainCmd,exeObj.argsStr,objAssign({shell:!0,winStyle:"hidden"},options))},child_process.execFile=function(file,args,options){return isSolidString(file)||throwErrNonStr("child_process.execFile",file),isSolidArray(args)||(args=[]),_run(file,args,objAssign({shell:!1,winStyle:"activeDef"},options))},child_process.execSync=function(command,options){isSolidString(command)||throwErrNonStr("child_process.execSync",command);var exeObj=child_process.splitCommand(command);return _runSync(exeObj.mainCmd,exeObj.argsStr,objAssign({shell:!0,winStyle:"hidden"},options))},child_process.execFileSync=function(file,args,options){return isSolidString(file)||throwErrNonStr("child_process.execFileSync",file),isSolidArray(args)||(args=[]),_runSync(file,args,objAssign({shell:!0,winStyle:"activeDef"},options))},child_process.spawnSync=function(command,options){isSolidString(command)||throwErrNonStr("child_process.spawnSync",command);var exeObj=child_process.splitCommand(command);try{return os.execSync(exeObj.mainCmd,exeObj.argsStr,objAssign({shell:!1},options))}catch(e){throw new Error(insp(e)+"\n  at child_process.spawnSync ("+MODULE_TITLE+')\n  command: "'+command+'"')}},child_process.execFileViaJSON=function(jsonPath,options){var assoc=fse.readJsonSync(jsonPath,options);if(!hasContent(assoc))throw new Error("Error: The content of the JSON file is empy\n  at child_process.execFileViaJSON ("+MODULE_TITLE+")\n  jsonPath: "+insp(jsonPath)+"\n  options: "+insp(options));var rtnAssoc=child_process.execFileSync(assoc.file,assoc.args,assoc.options);fse.writeJsonSync(jsonPath,Object.assign(assoc,rtnAssoc),options)},child_process.isRunningAsAdmin=function(processName){if(isSameStr(process.env.USERNAME,"administrator")||!os.hasUAC()||os.isUacDisable())return!0;var sWbemObjSet=os.WMI.getProcess(processName);if(!process.isAdmin())return hasContent(sWbemObjSet)?!hasContent(sWbemObjSet.ExecutablePath):undefined;var tmpJsPath=os.makeTmpPath("isRunningAsAdmin-",".js"),codeGetExePathWithPID='var W = WScript;var E = new Enumerator(W.CreateObject("WbemScripting.SWbemLocator").ConnectServer(null, "root\\\\CIMV2").ExecQuery("SELECT * FROM Win32_Process WHERE ProcessID='+sWbemObjSet.ProcessID+'"));var ws = [];while (!E.atEnd()) { ws.push(E.item()); E.moveNext(); }if (ws.length === 0) W.Quit(1);var ps = new Enumerator(ws[0].Properties_); var p;while (!ps.atEnd()) {p = ps.item(); if (p.Name === "ExecutablePath") {W.Echo(p.Value); W.Quit(0); } ps.moveNext(); }W.Quit();',tmpJs=fso.CreateTextFile(tmpJsPath);tmpJs.Write(codeGetExePathWithPID),tmpJs.Close();var rtnDic=child_process.execFileSync(os.exefiles.cscript,["//nologo",tmpJsPath],{encoding:os.cmdCodeset(),winStyle:"hidden",runsAdmin:!1});return fso.DeleteFile(tmpJsPath,CD.fso.force.yes),hasContent(rtnDic.stdout)?!!/^null/.test(rtnDic.stdout)||!path.isAbsolute(rtnDic.stdout.trim())&&void 0:undefined},child_process.writeProcessPropsToJson=function(processName,jsonPath){return fse.writeJsonSync(jsonPath,os.getProcessObj(processName))},child_process.registTaskForExecutingHighWIL=function(){},child_process.setExePath=function(setVar,req32,req64,exePath){if(hasContent(exePath)?setVar=exePath:setVar!==undefined&&(setVar=path.join(__dirname,path.parse(setVar).base),fs.statSync(setVar).isFile()||(setVar=hasContent(req64)&&os.is64arch()?fse.findRequiredFile(req64):fse.findRequiredFile(req32))),!hasContent(setVar))throw new Error("Error: Failed to find the path\n  at child_process.setExePath ("+MODULE_TITLE+")\n  req64: "+insp(req64)+"\n  exePath: "+insp(exePath));return setVar})}();