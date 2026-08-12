with open('index.html', 'r') as f:
    html = f.read()

start = html.find('async function saveProject(forceNewLocation){')
end = html.find('function decodeLayersData', start)
print(html[start:end])
