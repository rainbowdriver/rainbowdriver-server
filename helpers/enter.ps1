$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/WindowsInput.dll")

Write-Host "MoveMouseToPositionOnVirtualDesktop"
$mouse = new-object WindowsInput.MouseSimulator
$mouse.MoveMouseToPositionOnVirtualDesktop(0,0)
$mouse.LeftButtonDown()
$mouse.LeftButtonUp()
Write-Host "RETURN"
$keyb = new-object WindowsInput.KeyboardSimulator
$keyb.KeyPress("RETURN")
