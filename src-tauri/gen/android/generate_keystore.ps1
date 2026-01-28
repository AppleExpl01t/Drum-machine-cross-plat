$keyAlias = "release"
$keyPassword = "password"
$storePassword = "password"
$keystoreName = "release.keystore"
$validity = 10000

# Get the directory of the script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keystorePath = Join-Path $scriptDir "app/$keystoreName"
$propsPath = Join-Path $scriptDir "key.properties"

# Check if keytool is available
if (-not (Get-Command "keytool" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: keytool is not in your PATH. Please ensure the Java/Android SDK bin directory is in your PATH." -ForegroundColor Red
    exit 1
}

# Generate Keystore
if (-not (Test-Path $keystorePath)) {
    Write-Host "Generating keystore at $keystorePath..."
    & keytool -genkey -v -keystore $keystorePath -alias $keyAlias -keyalg RSA -keysize 2048 -validity $validity -storepass $storePassword -keypass $keyPassword -dname "CN=Android Debug,O=Android,C=US"
    if ($LASTEXITCODE -eq 0) {
         Write-Host "Keystore generated successfully." -ForegroundColor Green
    } else {
         Write-Host "Failed to generate keystore." -ForegroundColor Red
         exit 1
    }
} else {
    Write-Host "Keystore already exists at $keystorePath." -ForegroundColor Yellow
}

# Generate key.properties
$propsContent = @"
storePassword=$storePassword
keyPassword=$keyPassword
keyAlias=$keyAlias
storeFile=$keystoreName
"@

Write-Host "Generating key.properties at $propsPath..."
Set-Content -Path $propsPath -Value $propsContent
Write-Host "key.properties generated successfully." -ForegroundColor Green

Write-Host "Done! You can now run your build." -ForegroundColor Cyan
