$files = Get-ChildItem -Path src -Recurse -Filter *.jsx
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Reverse h-4! to !h-4
    $newContent = $content -replace ' ([a-z0-9-\[\]/]+)!', ' !$1'
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Reverted $($file.FullName)"
    }
}
