$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/InputSimulator.dll")
[WindowsInput.InputSimulator]::SimulateKeyPress("RETURN")
