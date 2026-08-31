@echo off
cd /d "C:\Users\jaisi\Documents\GDS Creatives\call-center"
node node_modules\next\dist\bin\next dev -p 3001 > "logs\next-out.log" 2> "logs\next-err.log"
