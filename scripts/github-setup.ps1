# 한 번만 실행: GitHub 로그인 후 원격 저장소 생성 및 push
# 사용: weverse-preorder 폴더에서  pwsh -File scripts/github-setup.ps1  [-RepoName 이름] [-Private]

param(
  [string]$RepoName = "weverse-preorder",
  [switch]$Private
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$gh = "${env:ProgramFiles}\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

Set-Location $RepoRoot
Write-Host "저장소 경로: $RepoRoot"

$authCheck = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nGitHub 로그인이 필요합니다. 브라우저에서 인증을 완료하세요.`n"
  & $gh auth login -h github.com -p https -w
}

$remotes = @(git remote)
if ($remotes -contains "origin") {
  Write-Host "origin 이미 있음. push 만 시도합니다."
  git push -u origin main
  exit $LASTEXITCODE
}

Write-Host "`nGitHub에 저장소 생성: $RepoName`n"
if ($Private) {
  & $gh repo create $RepoName --private --source=. --remote=origin --push --description "Weverse Shop 예약판매 모아보기 + 자동 데이터 수집"
} else {
  & $gh repo create $RepoName --public --source=. --remote=origin --push --description "Weverse Shop 예약판매 모아보기 + 자동 데이터 수집"
}

Write-Host "`n다음 단계:`n  1) GitHub 저장소 Settings > Secrets > WEVERSE_REFRESH_TOKEN 등록`n  2) Settings > Actions > Workflow permissions: Read and write`n  3) Vercel 대시보드에서 이 GitHub 저장소와 프로젝트 연결(Git 연동)`n"
