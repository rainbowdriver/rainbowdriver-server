$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/WindowsInput.dll")

# Please, keep comments because this lib is not documented

# Write-Host "MoveMouseToPositionOnVirtualDesktop"
# $mouse = new-object WindowsInput.MouseSimulator
# $mouse.MoveMouseToPositionOnVirtualDesktop(0,0)
# $mouse.LeftButtonDown()
# $mouse.LeftButtonUp()

$keyb = new-object WindowsInput.KeyboardSimulator

if ($args[0] -eq "KeyPress") {
    Write-Host "Simulating KeyPress" $args[1]
    $keyb.KeyPress($args[1])
} elseif ($args[0] -eq "ModifiedKeyStroke") {
    Write-Host "Simulating ModifiedKeyStroke" $args[1] "+" $args[2]
    $keyb.ModifiedKeyStroke($args[1], $args[2])
} elseif ($args[0] -eq "TextEntry") {
    Write-Host "Simulating TextEntry" $args[1]
    $keyb.TextEntry($args[1])
}
