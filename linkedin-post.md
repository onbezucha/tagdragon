# TagDragon — LinkedIn Post

---

### 🐉 The dragon that sees every tag.

Znáš to. Otevřeš Network tab, type "collect", a pak scroluješ stovký requestů, abys zjistil, jestli ten tvůj nový GTM tag vůbec něco odesílá. Nebo jestli Meta Pixel posílá správný event. Nebo jestli ten Hotjar, co někdo přidal minulý měsíc, neposílá polovinu stránky ven.

Já jsem z toho dostal akorát tak migrénu. Tak jsem si řekl — musí existovat lepší způsob.

**TagDragon** je Chrome DevTools extension, co to dělá sám. Zachytí tracking requesty z 69 providerů a rovnou je dekóduje do čitelný podoby. Bez grepování, bez base64 dekódování, bez otevíraní tuctu tabů.

**Co všechno umí:**

🔍 **69 providerů automaticky** — GA4, Meta, TikTok, LinkedIn, Adobe, Hotjar, FullStory, Braze, Optimizely, mParticle, HubSpot… prostě otevřeš DevTools a vidíš všechno

🗄️ **DataLayer Inspector** — intercepts GTM, Tealium, Adobe, Segment i digitalData. Ukáže ti diff mezi pushi, cumulative state, a dokonce ti koreluje datalayer pushy se síťovýma requestama

🔐 **Consent Panel** — chceš vědět, jak se tvý tagy chovaj, když consent neschválíš? Testuj bez ručního mazání cookies

🔄 **Adobe Env Switcher** — přepínáš DEV/ACC/PROD na síťový úrovni, persistuje přes navigace, žádný fiddling s URL

⌨️ **Keyboard shortcuts, dark mode, export do JSON/CSV** — protože scrollovat myší je tak rok 2015

A to nejlepší? Všechno běží lokálně v prohlížeči. Žádná data neodcházejí ven. Žádný účet, žádný paywall. Prostě to nainstaluješ a funguje to.

🔗 https://www.tagdragon.net
⭐ https://github.com/onbezucha/tagdragon

Někdo z MarTech / GTM / analytics lidí tady? Dejte vědět, co používáte na debugování 🙋‍♂️

#MarTech #GTM #Analytics #ChromeExtension #DataLayer #WebAnalytics #TagManagement #AdobeAnalytics #GA4

---

## 💡 Tipy pro publikaci

1. **Obrázek:** Dej tam screenshot z tagdragon.net — decoded requesty s barevnýma providerama vypadaj nejlíp
2. **První komentář:** Hned po publikaci přidej osobní use-case, např. "Minulý týden jsem přes to odhalil, že na jednom e-commerce webu Meta Pixel odesílal 3× purchase event při jedný objednávce…"
3. **Časování:** Úterý–čtvrtek, 8:00–10:00 CET
4. **Taguj lidi:** Pokud máš v síti někoho z GTM / MarTech komunity, označ ho v komentáři
