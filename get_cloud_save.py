with open('index.html', 'r') as f:
    html = f.read()

start = html.find('cloudSaveSubmitBtn.addEventListener')
end = html.find('if (cloudRefreshListBtn)', start)
print(html[start:end])
