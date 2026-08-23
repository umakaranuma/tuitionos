import os

for root, dirs, files in os.walk("apps"):
    for file in files:
        if file.startswith("urls") and file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            if "router = DefaultRouter()" in content:
                content = content.replace("router = DefaultRouter()", "router = DefaultRouter(trailing_slash=False)")
                with open(path, "w") as f:
                    f.write(content)
print("done replacing")
