@echo off
setlocal

echo Running clean-db...
call npx vercel env run -e production -- npm run clean-db
if errorlevel 1 exit /b %errorlevel%

echo Running db:schema...
call npx vercel env run -e production -- npm run db:schema
if errorlevel 1 exit /b %errorlevel%

echo Running create-admin...
call npx vercel env run -e production -- npm run create-admin
if errorlevel 1 exit /b %errorlevel%

echo All commands finished successfully.
endlocal