import os
import zipfile

def zip_project():
    zip_name = "Atlas-Studio-Source.zip"
    if os.path.exists(zip_name):
        os.remove(zip_name)
    
    exclude_dirs = {"node_modules", "dist", "dist-app", ".atlas", ".turbo", ".git"}
    
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk("."):
            # Modifying dirs in-place to exclude directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file == zip_name or file == "zip_project.py":
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, ".")
                zipf.write(file_path, arcname)

if __name__ == "__main__":
    zip_project()
