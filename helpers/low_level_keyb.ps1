$scriptpath = $MyInvocation.MyCommand.Path
$dir = Split-Path $scriptpath

[Reflection.Assembly]::LoadFile("$dir/InputSimulator.dll")

if ($args.length -eq 1) {
	[WindowsInput.InputSimulator]::SimulateKeyPress($args[0])
} else  {
	[WindowsInput.InputSimulator]::SimulateModifiedKeyStroke($args[0], $args[1])
}
