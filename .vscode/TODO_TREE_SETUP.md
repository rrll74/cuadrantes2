# Configuración de Todo Tree - Windows, Ubuntu, macOS

## ⚡ Solución Rápida para Todos los SO

### 1️⃣ Instala ripgrep (si aún no lo tienes)

**Windows** (con winget):

```bash
winget install --id BurntSushi.ripgrep.MSVC -e --accept-package-agreements --accept-source-agreements
```

Como norma general la ruta debería ser: "C:\\Users\\rll_l\\AppData\\Local\\Microsoft\\WinGet\\Packages\\BurntSushi.ripgrep.MSVC_Microsoft.Winget.Source_8wekyb3d8bbwe\\ripgrep-15.2.0-x86_64-pc-windows-msvc\\rg.exe"

**Ubuntu/Debian**:

```bash
sudo apt update && sudo apt install -y ripgrep
```

Como norma General la ruta debería ser: "/bin/rg"

**macOS** (con Homebrew):

```bash
brew install ripgrep
```

### 2️⃣ Ejecuta el script de configuración automática

```bash
bash .vscode/setup-ripgrep.sh
```

Este script genera automáticamente `settings.json` con la configuración correcta para tu SO.

### 3️⃣ Reinicia VS Code

¡Listo! Todo Tree debería funcionar sin errores.

---

## 📋 Explicación Técnica

- El archivo `.vscode/settings.json` **NO se comitea** (está en `.gitignore`) para evitar conflictos entre SO
- Cada máquina genera su propio `settings.json` mediante el script
- Usamos `"rg"` (desde PATH) que funciona universalmente tras instalar ripgrep en cualquier SO
- `settings.example.json` es la plantilla de referencia

## 🔧 Si prefieres configurar manualmente (sin script)

Edita `.vscode/settings.json` y asegúrate de que contiene:

```json
{
  "prettier.endOfLine": "auto",
  "todo-tree.ripgrep.ripgrep": "rg"
}
```

Nota: Después de editar, NO hagas commit de `settings.json` (ya está en `.gitignore`).

## 📂 Archivos relevantes

- `.vscode/setup-ripgrep.sh` — Script de configuración automática
- `.vscode/settings.example.json` — Plantilla de referencia
- `.vscode/.gitignore` — Ignora `settings.json` y `settings.local.json`
