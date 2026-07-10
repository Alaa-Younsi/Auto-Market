Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background
$bgColor = [System.Drawing.Color]::FromArgb(255, 8, 13, 24)
$g.Clear($bgColor)

# Radial glow (blue) via PathGradientBrush
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(200, -250, 1400, 1400)
$glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
$glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(140, 33, 96, 235)
$glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 8, 13, 24))
$g.FillPath($glowBrush, $glowPath)

# Secondary green glow bottom-left
$glowPath2 = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath2.AddEllipse(-300, 250, 900, 900)
$glowBrush2 = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath2)
$glowBrush2.CenterColor = [System.Drawing.Color]::FromArgb(70, 21, 160, 89)
$glowBrush2.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 8, 13, 24))
$g.FillPath($glowBrush2, $glowPath2)

# Logo mark (rounded square with "A")
$logoRect = New-Object System.Drawing.Rectangle(100, 130, 96, 96)
$logoBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  $logoRect,
  [System.Drawing.Color]::FromArgb(255, 96, 148, 255),
  [System.Drawing.Color]::FromArgb(255, 22, 68, 176),
  45
)
$logoPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 24
$logoPath.AddArc($logoRect.X, $logoRect.Y, $radius, $radius, 180, 90)
$logoPath.AddArc($logoRect.X + $logoRect.Width - $radius, $logoRect.Y, $radius, $radius, 270, 90)
$logoPath.AddArc($logoRect.X + $logoRect.Width - $radius, $logoRect.Y + $logoRect.Height - $radius, $radius, $radius, 0, 90)
$logoPath.AddArc($logoRect.X, $logoRect.Y + $logoRect.Height - $radius, $radius, $radius, 90, 90)
$logoPath.CloseFigure()
$g.FillPath($logoBrush, $logoPath)

$logoFont = New-Object System.Drawing.Font("Segoe UI", 44, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$logoTextFormat = New-Object System.Drawing.StringFormat
$logoTextFormat.Alignment = [System.Drawing.StringAlignment]::Center
$logoTextFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("A", $logoFont, $whiteBrush, [System.Drawing.RectangleF]::new(100, 130, 96, 96), $logoTextFormat)

# Brand name
$titleFont = New-Object System.Drawing.Font("Segoe UI", 64, [System.Drawing.FontStyle]::Bold)
$g.DrawString("Auto Market", $titleFont, $whiteBrush, 220, 145)

# Tagline
$taglineFont = New-Object System.Drawing.Font("Segoe UI", 28, [System.Drawing.FontStyle]::Regular)
$mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 180, 195, 220))
$g.DrawString("Pieces et accessoires auto, livres chez vous", $taglineFont, $mutedBrush, 100, 330)

# Bottom accent line
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 21, 160, 89))
$g.FillRectangle($greenBrush, 100, 420, 140, 6)
$blueBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 33, 96, 235))
$g.FillRectangle($blueBrush2, 250, 420, 60, 6)

# Bottom tag row
$smallFont = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Regular)
$g.DrawString("Paiement a la livraison  -  58 wilayas  -  Algerie", $smallFont, $mutedBrush, 100, 470)

$outPath = Join-Path $PSScriptRoot "..\public\og-image.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()

Write-Host "OG image written to $outPath"
