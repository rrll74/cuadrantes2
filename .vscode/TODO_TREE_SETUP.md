# Configuración de Todo Tree - Windows y Ubuntu

## Windows 11 ✅

Ya está configurado automáticamente en `.vscode/settings.json`:

- Usa la ruta absoluta de ripgrep instalado por winget
- Solo tienes que reiniciar VS Code

```bash
# Si el error persiste, reinstala ripgrep:
winget uninstall BurntSushi.ripgrep.MSVC
winget install --id BurntSushi.ripgrep.MSVC -e --accept-package-agreements --accept-source-agreements
```

## Ubuntu 24.04

Cuando abras el proyecto en Ubuntu:

1. Instala ripgrep (si no lo tienes):

```bash
sudo apt update && sudo apt install -y ripgrep
```

2. **Crea un archivo `.vscode/settings.local.json`** (local, no se commitea):

```json
{
  "todo-tree.ripgrep.ripgrep": "rg"
}
```

3. Reinicia VS Code

## Explicación

- **Windows**: usa ruta absoluta porque ripgrep está en una carpeta de versión específica
- **Ubuntu**: usa `rg` desde PATH porque ripgrep se instala globalmente

La razón por la que no podemos usar la ruta Windows en Linux es que no existe en ese SO. La solución `.local.json` es una práctica estándar en monorepos multiplataforma.

## Git Ignore

Si quieres, añade esto a `.vscode/.gitignore`:

```
settings.local.json
```

Así cada usuario puede tener su propia configuración local sin afectar el repositorio.
