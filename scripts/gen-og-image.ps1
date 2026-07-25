Add-Type -AssemblyName System.Drawing

# Social-preview image (og:image / twitter:image): a straight crop of the
# site's real hero photo (public/bgimage.png), no text baked in — link
# previews (Telegram, WhatsApp, etc.) already render title/description from
# the page's meta tags above the image, so overlaying text here just
# duplicates it and looks worse at thumbnail size.

$targetWidth = 1200
$targetHeight = 630

$srcPath = Join-Path $PSScriptRoot "..\public\bgimage.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

$scale = $targetWidth / $src.Width
$scaledWidth = [int][Math]::Round($src.Width * $scale)
$scaledHeight = [int][Math]::Round($src.Height * $scale)

$scaled = New-Object System.Drawing.Bitmap($scaledWidth, $scaledHeight)
$g = [System.Drawing.Graphics]::FromImage($scaled)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.DrawImage($src, 0, 0, $scaledWidth, $scaledHeight)
$g.Dispose()
$src.Dispose()

# Center the crop on the headlight glow (~y=950 in the 1080x1920 source).
$focusY = 950 * $scale
$top = [int]($focusY - $targetHeight / 2)
$top = [Math]::Max(0, [Math]::Min($top, $scaledHeight - $targetHeight))

$cropRect = New-Object System.Drawing.Rectangle(0, $top, $targetWidth, $targetHeight)
$cropped = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$g2 = [System.Drawing.Graphics]::FromImage($cropped)
$g2.DrawImage($scaled, (New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$scaled.Dispose()

$outPath = Join-Path $PSScriptRoot "..\public\og-image.png"
$cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()

Write-Host "OG image written to $outPath"
