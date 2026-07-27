#!/usr/bin/env python3
"""Sube un zip de release a la Mac y reemplaza archivos.

Credenciales por variables de entorno (no hardcodear secretos):
  DEPLOY_HOST, DEPLOY_USER, DEPLOY_PASSWORD
  DEPLOY_ZIP (opcional): ruta al zip local
"""
import os
import sys
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Instalando paramiko...")
    os.system(f"{sys.executable} -m pip install paramiko -q")
    import paramiko

HOST = os.environ.get("DEPLOY_HOST", "").strip()
USER = os.environ.get("DEPLOY_USER", "").strip()
PASSWORD = os.environ.get("DEPLOY_PASSWORD", "")
LOCAL_ZIP = Path(
    os.environ.get(
        "DEPLOY_ZIP",
        str(Path(__file__).resolve().parent / "release.zip"),
    )
)


def find_project_dir(ssh):
    cmd = r"""
for d in \
  "$HOME/chip torres mendoza, el algoritmo del tirmo" \
  "$HOME/Documents/chip torres mendoza, el algoritmo del tirmo" \
  "$HOME/Desktop/chip torres mendoza, el algoritmo del tirmo" \
  "$HOME/dev/chip torres mendoza, el algoritmo del tirmo"; do
  if [ -f "$d/docker-compose.yml" ] || [ -f "$d/package.json" ]; then
    echo "$d"
    exit 0
  fi
done
find "$HOME" -maxdepth 4 -type f -name docker-compose.yml 2>/dev/null | while read f; do
  dir=$(dirname "$f")
  if [ -f "$dir/package.json" ]; then echo "$dir"; exit 0; fi
done
"""
    _, stdout, stderr = ssh.exec_command(cmd)
    path = stdout.read().decode().strip().split("\n")[0].strip()
    err = stderr.read().decode().strip()
    if not path:
        raise RuntimeError(f"No se encontro el proyecto en la Mac. {err}")
    return path


def main():
    if not HOST or not USER or not PASSWORD:
        print(
            "ERROR: Define DEPLOY_HOST, DEPLOY_USER y DEPLOY_PASSWORD en el entorno."
        )
        sys.exit(1)

    if not LOCAL_ZIP.exists():
        print(f"ERROR: No existe {LOCAL_ZIP}")
        sys.exit(1)

    print(f"Conectando a {USER}@{HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    remote_dir = find_project_dir(ssh)
    print(f"Proyecto encontrado: {remote_dir}")

    remote_zip = f"{remote_dir}/{LOCAL_ZIP.name}"
    print("Subiendo ZIP...")
    sftp = ssh.open_sftp()
    sftp.put(str(LOCAL_ZIP), remote_zip)
    sftp.close()

    print("Extrayendo y reemplazando archivos...")
    unzip_cmd = f"""
cd "{remote_dir}" && \
unzip -o "{remote_zip}" && \
chmod +x docker-rebuild.sh docker-start.sh docker-stop.sh 2>/dev/null || true && \
rm -f "{remote_zip}" && \
echo "DEPLOY_OK"
"""
    _, stdout, stderr = ssh.exec_command(unzip_cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if "DEPLOY_OK" not in out:
        print("STDOUT:", out)
        print("STDERR:", err)
        raise RuntimeError("Fallo la extraccion en la Mac")

    ssh.close()
    print("Listo. Archivos actualizados en la Mac.")
    print(f"Ruta: {remote_dir}")
    print("Siguiente paso en la Mac: ./docker-rebuild.sh  o  ./docker-start.sh")


if __name__ == "__main__":
    main()
