with open('index.html', 'r') as f:
    html = f.read()

start = html.find("const APP_VERSION = 'v0.158';")
end = html.find('let activeLayer', start)
print(html[start:end])
