import pathlib
p = pathlib.Path(r"C:/Users/jaisi/Documents/GDS Creatives/call-center/src/components/homepage/FinalHero/FinalHero.hero.css")
t = p.read_text(encoding='utf-8')
t = t.replace("@tailwind base;\n", "")
t = t.replace("@tailwind components;\n", "")
t = t.replace("@tailwind utilities;\n", "")
if "@layer utilities {" in t:
    t = t.replace("@layer utilities {", "", 1)
    t = t.replace("\n}\n\nbody {", "\n\n.final-hero-root {", 1)
    t = t.replace("font-family: var(--font-inter), sans-serif;", "font-family: Inter, ui-sans-serif, system-ui, sans-serif;")
    if 'Inter' not in t[:800]:
        t = '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");\n' + t
p.write_text(t, encoding='utf-8')
print("patched", len(t))
print(t[:900])
