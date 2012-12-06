$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/InputSimulator.dll")
[WindowsInput.InputSimulator]::SimulateModifiedKeyStroke('LWIN', 'OEM_PERIOD')
