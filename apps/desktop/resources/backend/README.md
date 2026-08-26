# backend.exe 放这里

打包前，用 PyInstaller 生成单文件后端，并放到这个目录：

```powershell
cd ..\..\..\backend
uv run pyinstaller --noconfirm --clean backend.spec
Copy-Item dist\backend.exe ..\apps\desktop\resources\backend\backend.exe
```

electron-builder 会把它连同前端、数据库一起打进安装包。
