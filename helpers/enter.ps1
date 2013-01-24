$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/WindowsInput.dll")

# Write-Host "MoveMouseToPositionOnVirtualDesktop"
# $mouse = new-object WindowsInput.MouseSimulator
# $mouse.MoveMouseToPositionOnVirtualDesktop(500,1)
# $mouse.LeftButtonClick()
# Start-Sleep 2
# Write-Host "RETURN"
$keyb = new-object WindowsInput.KeyboardSimulator
$keyb.KeyPress("TAB")
$keyb.KeyPress("RETURN")
