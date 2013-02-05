$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/WindowsInput.dll")

$keyb = new-object WindowsInput.KeyboardSimulator
$keyb.KeyPress("ESCAPE")
