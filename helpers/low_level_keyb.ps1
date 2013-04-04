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

if ($args.length -eq 1) {
    Write-Host "Simulating KeyPress "
    Write-Host $args[0]
    $keyb.KeyPress($args[0])
} else  {
    Write-Host "Simulating ModifiedKeyStroke"
    Write-Host $args[0]
    Write-Host $args[1]
    $keyb.ModifiedKeyStroke($args[0], $args[1])
}
